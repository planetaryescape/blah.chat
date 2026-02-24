"use node";

/**
 * Auto Model Router
 *
 * Intelligently routes user messages to the optimal model based on:
 * - Task classification (coding, reasoning, creative, etc.)
 * - User preferences (cost/speed bias)
 * - Model capabilities and context requirements
 */

import { createOpenAI } from "@ai-sdk/openai";
import {
  buildClassificationPrompt,
  getCostTier,
  getEligibleModels,
  MODEL_CONFIG,
  MODEL_PROFILES,
  ROUTER_REASONING_TEMPLATE,
  type RouterResult,
  scoreModels,
  selectWithExploration,
  TASK_CATEGORIES,
  type TaskCategoryId,
  type TaskClassification,
} from "@blah-chat/auto-router";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import { logger } from "../lib/logger";

/**
 * Get model instance for router (using Vercel AI Gateway)
 */
function getRouterModel() {
  const openai = createOpenAI({
    apiKey: process.env.AI_GATEWAY_API_KEY,
    baseURL:
      "https://gateway.ai.cloudflare.com/v1/planetaryescape/blah-chat-dev-gateway/openai",
  });
  // Use gpt-oss-120b via Cerebras for fast classification
  return openai("gpt-oss-120b");
}

/**
 * Calculate cost from token usage
 */
function calculateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: { input: number; output: number },
): number {
  return (
    (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
  );
}

/**
 * Router model - fast + intelligent enough for classification
 * GPT-OSS-120B via Cerebras: ~1000 tokens/sec, good reasoning
 */
const ROUTER_MODEL_ID = "openai:gpt-oss-120b";

/**
 * Classification result schema for generateObject
 */
const HIGH_STAKES_DOMAINS = [
  "medical",
  "legal",
  "financial",
  "safety",
  "mental_health",
  "privacy",
  "immigration",
  "domestic_abuse",
] as const;

const classificationSchema = z.object({
  primaryCategory: z.enum(TASK_CATEGORIES as unknown as [string, ...string[]]),
  secondaryCategory: z
    .enum(TASK_CATEGORIES as unknown as [string, ...string[]])
    .optional()
    .nullable(),
  complexity: z.enum(["simple", "moderate", "complex"]),
  requiresVision: z.boolean(),
  requiresLongContext: z.boolean(),
  requiresReasoning: z.boolean(),
  confidence: z.number().min(0).max(1),
  isHighStakes: z.boolean(),
  highStakesDomain: z.enum(HIGH_STAKES_DOMAINS).optional().nullable(),
  // Stickiness evaluation - should we keep the previous model?
  recommendedAction: z.enum(["keep", "change"]),
  changeReason: z.string().optional().nullable(),
});

/**
 * Main routing action - classifies task and selects optimal model
 *
 * Called from chat.ts when user has "auto" selected as their model.
 */
export const routeMessage = internalAction({
  args: {
    userMessage: v.string(),
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    hasAttachments: v.boolean(),
    attachmentTypes: v.optional(v.array(v.string())),
    currentContextTokens: v.optional(v.number()),
    preferences: v.object({
      costBias: v.number(),
      speedBias: v.number(),
    }),
    previousSelectedModel: v.optional(v.string()),
    excludedModels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<RouterResult> => {
    const startTime = Date.now();

    try {
      // Check router mode from config
      const routerConfig = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        api.models.queries.getRouterConfig,
        {},
      )) as { routerMode?: string } | null;

      const routerMode = routerConfig?.routerMode ?? "legacy_scoring";

      if (routerMode === "classifier_v1" || routerMode === "shadow_compare") {
        const classifierResult = (await (ctx.runAction as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.ai.classifierRouter.routeMessageV2,
          {
            userMessage: args.userMessage,
            conversationId: args.conversationId,
            userId: args.userId,
            hasAttachments: args.hasAttachments,
            attachmentTypes: args.attachmentTypes,
            currentContextTokens: args.currentContextTokens,
            preferences: args.preferences,
            previousSelectedModel: args.previousSelectedModel,
            excludedModels: args.excludedModels,
          },
        )) as RouterResult;

        if (routerMode === "classifier_v1") {
          return classifierResult;
        }

        // shadow_compare: log classifier result, continue with legacy
        logger.info("Shadow compare - classifier result", {
          tag: "AutoRouter",
          classifierModel: classifierResult.selectedModelId,
          classifierReasoning: classifierResult.reasoning,
        });
      }

      // Build previous model context for sticky routing evaluation
      let previousModelContext:
        | {
            id: string;
            name: string;
            tier: "cheap" | "mid" | "premium";
            hasVision: boolean;
            hasReasoning: boolean;
            maxContextTokens: number;
          }
        | undefined;

      if (args.previousSelectedModel) {
        const prevConfig = MODEL_CONFIG[args.previousSelectedModel];
        if (prevConfig) {
          previousModelContext = {
            id: args.previousSelectedModel,
            name: prevConfig.name,
            tier: getCostTier(prevConfig.pricing),
            hasVision: prevConfig.capabilities.includes("vision"),
            hasReasoning:
              prevConfig.capabilities.includes("thinking") ||
              prevConfig.capabilities.includes("extended-thinking"),
            maxContextTokens: prevConfig.contextWindow,
          };
        }
      }

      // 1. Classify the task (includes stickiness evaluation)
      const classification = await classifyTask(
        args.userMessage,
        args.hasAttachments,
        args.attachmentTypes,
        ctx,
        args.userId,
        previousModelContext,
      );

      // 2. STICKY ROUTING: Early exit if classifier recommends keeping previous model
      if (
        args.previousSelectedModel &&
        classification.recommendedAction === "keep" &&
        !args.excludedModels?.includes(args.previousSelectedModel)
      ) {
        const prevConfig = MODEL_CONFIG[args.previousSelectedModel];

        // CRITICAL: Validate previous model still meets new task requirements
        // Even if classifier says "keep", we must verify capability compatibility
        const canKeepPreviousModel =
          prevConfig &&
          // Vision requirement check
          (!classification.requiresVision ||
            prevConfig.capabilities.includes("vision")) &&
          // Long context requirement check (128K+)
          (!classification.requiresLongContext ||
            prevConfig.contextWindow >= 128000) &&
          // Context window must fit current conversation
          prevConfig.contextWindow >= (args.currentContextTokens ?? 0) * 1.2;

        if (canKeepPreviousModel) {
          logger.info("Sticky routing - keeping previous model", {
            tag: "AutoRouter",
            conversationId: args.conversationId,
            selectedModel: args.previousSelectedModel,
            classification: classification.primaryCategory,
            complexity: classification.complexity,
            routingTimeMs: Date.now() - startTime,
          });

          return {
            selectedModelId: args.previousSelectedModel,
            classification,
            reasoning: `Continuing with ${prevConfig?.name ?? args.previousSelectedModel} - task characteristics unchanged`,
            candidatesConsidered: 0,
            isSticky: true,
          };
        }

        // Previous model lacks required capabilities - fall through to full routing
        logger.info("Sticky routing skipped - capability mismatch", {
          tag: "AutoRouter",
          conversationId: args.conversationId,
          previousModel: args.previousSelectedModel,
          requiresVision: classification.requiresVision,
          hasVision: prevConfig?.capabilities.includes("vision"),
          requiresLongContext: classification.requiresLongContext,
          contextWindow: prevConfig?.contextWindow,
        });
      }

      // 3. Get eligible models (filter by capabilities, context, excluded models, etc.)
      const eligibleModels = getEligibleModels(
        classification,
        args.currentContextTokens ?? 0,
        args.excludedModels,
      );

      if (eligibleModels.length === 0) {
        const fallbackModel = "openai:gpt-5-mini";
        // Check if fallback is also excluded (all models exhausted)
        if (args.excludedModels?.includes(fallbackModel)) {
          logger.error("All models exhausted including fallback", {
            tag: "AutoRouter",
            excludedModels: args.excludedModels,
          });
          throw new Error("All models exhausted including fallback");
        }
        // Fallback to default model if no eligible models found
        logger.warn("No eligible models found, using default", {
          tag: "AutoRouter",
        });
        return {
          selectedModelId: fallbackModel,
          classification,
          reasoning: "No eligible models matched requirements, using default",
          candidatesConsidered: 0,
        };
      }

      // 4. Score and rank models
      const scoredModels = scoreModels(
        eligibleModels,
        classification,
        args.preferences,
        args.previousSelectedModel,
      );

      // 5. Select model with exploration for variety
      const selectedModel = selectWithExploration(scoredModels, classification);

      // 6. Generate reasoning
      const modelConfig = MODEL_CONFIG[selectedModel.modelId];
      const modelProfile = MODEL_PROFILES[selectedModel.modelId];
      const categoryScore =
        modelProfile?.categoryScores[classification.primaryCategory] ?? 70;
      const reasoning = ROUTER_REASONING_TEMPLATE(
        classification.primaryCategory,
        classification.complexity,
        modelConfig?.name ?? selectedModel.modelId,
        categoryScore,
        modelConfig?.pricing ?? { input: 0.5, output: 1.0 },
        args.preferences,
        classification.isHighStakes,
        classification.highStakesDomain,
      );

      logger.info("Model selected", {
        tag: "AutoRouter",
        conversationId: args.conversationId,
        selectedModel: selectedModel.modelId,
        score: selectedModel.score,
        classification: classification.primaryCategory,
        complexity: classification.complexity,
        isHighStakes: classification.isHighStakes,
        highStakesDomain: classification.highStakesDomain,
        candidatesConsidered: eligibleModels.length,
        explorationPick: selectedModel.explorationPick,
        routingTimeMs: Date.now() - startTime,
      });

      return {
        selectedModelId: selectedModel.modelId,
        classification,
        reasoning,
        candidatesConsidered: eligibleModels.length,
        explorationPick: selectedModel.explorationPick,
      };
    } catch (error) {
      logger.error("Auto router error", {
        tag: "AutoRouter",
        error: String(error),
      });

      // Fallback to default model on error
      return {
        selectedModelId: "openai:gpt-5-mini",
        classification: {
          primaryCategory: "conversation",
          complexity: "simple",
          requiresVision: false,
          requiresLongContext: false,
          requiresReasoning: false,
          confidence: 0,
          isHighStakes: false,
          recommendedAction: "change",
        },
        reasoning: "Routing failed, using default model",
        candidatesConsidered: 0,
      };
    }
  },
});

/**
 * Classify user message into task category
 * @param previousModelContext - Optional context about the previously selected model for sticky routing
 */
async function classifyTask(
  message: string,
  hasAttachments: boolean,
  attachmentTypes: string[] | undefined,
  ctx: ActionCtx,
  userId: Id<"users">,
  previousModelContext?: {
    id: string;
    name: string;
    tier: "cheap" | "mid" | "premium";
    hasVision: boolean;
    hasReasoning: boolean;
    maxContextTokens: number;
  },
): Promise<TaskClassification> {
  try {
    const response = await generateObject({
      model: getRouterModel(),
      schema: classificationSchema,
      temperature: 0.2,
      prompt: `${buildClassificationPrompt(previousModelContext)}

USER MESSAGE:
${message}

ATTACHMENTS: ${hasAttachments ? `Yes (${attachmentTypes?.join(", ") || "files"})` : "None"}`,
    });

    // Track router usage
    if (response.usage) {
      const inputTokens = response.usage.inputTokens ?? 0;
      const outputTokens = response.usage.outputTokens ?? 0;
      // GPT-OSS-120B pricing via Cerebras: ~$0.05/M in, $0.10/M out
      const cost = calculateCost(inputTokens, outputTokens, {
        input: 0.05,
        output: 0.1,
      });

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.usage.mutations.recordTextGeneration,
        {
          userId,
          model: ROUTER_MODEL_ID,
          inputTokens,
          outputTokens,
          cost,
          feature: "auto_router",
        },
      );
    }

    return {
      primaryCategory: response.object.primaryCategory as TaskCategoryId,
      secondaryCategory: response.object.secondaryCategory as
        | TaskCategoryId
        | undefined,
      complexity: response.object.complexity,
      requiresVision: response.object.requiresVision,
      requiresLongContext: response.object.requiresLongContext,
      requiresReasoning: response.object.requiresReasoning,
      confidence: response.object.confidence,
      isHighStakes: response.object.isHighStakes,
      highStakesDomain: response.object.highStakesDomain ?? undefined,
      recommendedAction: response.object.recommendedAction,
      changeReason: response.object.changeReason ?? undefined,
    };
  } catch (error) {
    logger.error("Task classification error", {
      tag: "AutoRouter",
      error: String(error),
    });

    // Conservative fallback - always "change" to trigger full routing
    return {
      primaryCategory: "conversation",
      complexity: "simple",
      requiresVision: false,
      requiresLongContext: false,
      requiresReasoning: false,
      confidence: 0,
      isHighStakes: false,
      recommendedAction: "change",
    };
  }
}

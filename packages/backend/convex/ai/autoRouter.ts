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
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
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

import {
  MODEL_CONFIG,
  MODEL_PROFILES,
  type RouterPreferences,
  type RouterResult,
  TASK_CATEGORIES,
  type TaskCategoryId,
  type TaskClassification,
} from "./modelProfiles";
import {
  ROUTER_CLASSIFICATION_PROMPT,
  ROUTER_REASONING_TEMPLATE,
} from "./routerPrompts";

/**
 * Router model - fast + intelligent enough for classification
 * GPT-OSS-120B via Cerebras: ~1000 tokens/sec, good reasoning
 */
const ROUTER_MODEL_ID = "openai:gpt-oss-120b";

// ============================================================================
// Diversity Configuration
// ============================================================================

type CostTier = "cheap" | "mid" | "premium";

/**
 * Categorize model by cost tier based on average pricing
 */
function getCostTier(pricing: { input: number; output: number }): CostTier {
  const avgCost = (pricing.input + pricing.output) / 2;
  if (avgCost < 1.0) return "cheap";
  if (avgCost < 5.0) return "mid";
  return "premium";
}

/**
 * Tier weights by complexity - determines probability of selecting each tier
 */
const TIER_WEIGHTS: Record<string, Record<CostTier, number>> = {
  simple: { cheap: 0.6, mid: 0.25, premium: 0.15 },
  moderate: { cheap: 0.5, mid: 0.3, premium: 0.2 },
  complex: { cheap: 0.3, mid: 0.4, premium: 0.3 },
};

/**
 * Select model with guaranteed diversity across cost tiers
 *
 * Instead of random exploration, uses weighted tier selection:
 * - Simple tasks: 60% cheap, 25% mid, 15% premium
 * - Complex tasks: 30% cheap, 40% mid, 30% premium
 */
function selectWithExploration(
  scoredModels: Array<{ modelId: string; score: number }>,
  classification: { complexity: string },
): { modelId: string; score: number; explorationPick: boolean } {
  if (scoredModels.length === 0) {
    throw new Error("No scored models to select from");
  }

  const sorted = [...scoredModels].sort((a, b) => b.score - a.score);

  // Group ALL models by cost tier (not limited to top N)
  const tiers: Record<CostTier, Array<{ modelId: string; score: number }>> = {
    cheap: [],
    mid: [],
    premium: [],
  };

  for (const model of sorted) {
    const config = MODEL_CONFIG[model.modelId];
    const tier = getCostTier(config.pricing);
    tiers[tier].push(model);
  }

  // Get weights for this complexity level
  const weights =
    TIER_WEIGHTS[classification.complexity] ?? TIER_WEIGHTS.simple;
  const roll = Math.random();

  let selectedTier: CostTier;
  let explorationPick = false;

  // Select tier based on weighted random
  if (roll < weights.cheap && tiers.cheap.length > 0) {
    selectedTier = "cheap";
  } else if (roll < weights.cheap + weights.mid && tiers.mid.length > 0) {
    selectedTier = "mid";
    explorationPick = true;
  } else if (tiers.premium.length > 0) {
    selectedTier = "premium";
    explorationPick = true;
  } else if (tiers.mid.length > 0) {
    selectedTier = "mid";
    explorationPick = true;
  } else {
    // Fallback to best overall if only cheap available
    return { ...sorted[0], explorationPick: false };
  }

  // Random selection within the chosen tier
  const pool = tiers[selectedTier];
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return { ...picked, explorationPick };
}

/**
 * Classification result schema for generateObject
 */
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
  },
  handler: async (ctx, args): Promise<RouterResult> => {
    const startTime = Date.now();

    try {
      // 1. Classify the task
      const classification = await classifyTask(
        args.userMessage,
        args.hasAttachments,
        args.attachmentTypes,
        ctx,
        args.userId,
      );

      // 2. Get eligible models (filter by capabilities, context, etc.)
      const eligibleModels = getEligibleModels(
        classification,
        args.currentContextTokens ?? 0,
      );

      if (eligibleModels.length === 0) {
        // Fallback to default model if no eligible models found
        logger.warn("No eligible models found, using default", {
          tag: "AutoRouter",
        });
        return {
          selectedModelId: "openai:gpt-5-mini",
          classification,
          reasoning: "No eligible models matched requirements, using default",
          candidatesConsidered: 0,
        };
      }

      // 3. Score and rank models
      const scoredModels = scoreModels(
        eligibleModels,
        classification,
        args.preferences,
        args.previousSelectedModel,
      );

      // 4. Select model with exploration for variety
      const selectedModel = selectWithExploration(scoredModels, classification);

      // 5. Generate reasoning
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
      );

      logger.info("Model selected", {
        tag: "AutoRouter",
        conversationId: args.conversationId,
        selectedModel: selectedModel.modelId,
        score: selectedModel.score,
        classification: classification.primaryCategory,
        complexity: classification.complexity,
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
        },
        reasoning: "Routing failed, using default model",
        candidatesConsidered: 0,
      };
    }
  },
});

/**
 * Classify user message into task category
 */
async function classifyTask(
  message: string,
  hasAttachments: boolean,
  attachmentTypes: string[] | undefined,
  ctx: ActionCtx,
  userId: Id<"users">,
): Promise<TaskClassification> {
  try {
    const response = await generateObject({
      model: getRouterModel(),
      schema: classificationSchema,
      temperature: 0.2,
      prompt: `${ROUTER_CLASSIFICATION_PROMPT}

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
    };
  } catch (error) {
    logger.error("Task classification error", {
      tag: "AutoRouter",
      error: String(error),
    });

    // Conservative fallback
    return {
      primaryCategory: "conversation",
      complexity: "simple",
      requiresVision: false,
      requiresLongContext: false,
      requiresReasoning: false,
      confidence: 0,
    };
  }
}

/**
 * Filter models eligible for the classified task
 */
function getEligibleModels(
  classification: TaskClassification,
  currentContextTokens: number,
): string[] {
  return Object.keys(MODEL_CONFIG).filter((modelId) => {
    const config = MODEL_CONFIG[modelId];

    // Exclude internal-only models
    if (config.isInternalOnly) return false;

    // Context window must fit current conversation (with 20% buffer)
    if (config.contextWindow < currentContextTokens * 1.2) return false;

    // Vision requirement
    if (
      classification.requiresVision &&
      !config.capabilities.includes("vision")
    ) {
      return false;
    }

    // Long context requirement (128K+)
    if (classification.requiresLongContext && config.contextWindow < 128000) {
      return false;
    }

    // Reasoning requirement
    if (
      classification.requiresReasoning &&
      !config.capabilities.includes("thinking") &&
      !config.capabilities.includes("extended-thinking")
    ) {
      // Allow but don't require - non-thinking models can still work
      // Just won't get bonus score
    }

    // Exclude image generation models for non-image tasks
    if (
      config.capabilities.includes("image-generation") &&
      classification.primaryCategory !== "multimodal"
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Score models based on task match and user preferences
 */
function scoreModels(
  modelIds: string[],
  classification: TaskClassification,
  preferences: RouterPreferences,
  previousSelectedModel?: string,
): Array<{ modelId: string; score: number }> {
  return modelIds
    .map((modelId) => {
      const config = MODEL_CONFIG[modelId];
      const profile = MODEL_PROFILES[modelId];

      // Base score from category match (0-100)
      let score = 50; // Default for models without profiles

      if (profile?.categoryScores) {
        score = profile.categoryScores[classification.primaryCategory] ?? 50;

        // Add secondary category bonus
        if (
          classification.secondaryCategory &&
          profile.categoryScores[classification.secondaryCategory]
        ) {
          score +=
            (profile.categoryScores[classification.secondaryCategory] ?? 0) *
            0.3;
        }
      }

      // Complexity adjustment
      if (classification.complexity === "simple") {
        // Prefer cheaper/faster models for simple tasks
        score *= 0.7;
      } else if (classification.complexity === "complex") {
        // Boost high-capability models for complex tasks
        if (profile?.qualityScore && profile.qualityScore >= 85) {
          score *= 1.2;
        }
      }

      // Cost bias adjustment (0-100)
      // Higher bias = more penalty for expensive models
      const avgCost = (config.pricing.input + config.pricing.output) / 2;
      const costPenalty = (avgCost / 30) * (preferences.costBias / 100) * 20;
      score -= costPenalty;

      // Speed bias adjustment (0-100)
      // Higher bias = more bonus for fast models
      const speedBonus = getSpeedBonus(modelId) * (preferences.speedBias / 100);
      score += speedBonus;

      // Stickiness bonus - prefer model already selected in conversation
      // Encourages continuity without preventing switches when task demands it
      if (previousSelectedModel && modelId === previousSelectedModel) {
        score += 25;
      }

      // Bonus for reasoning models when reasoning is required
      if (
        classification.requiresReasoning &&
        (config.capabilities.includes("thinking") ||
          config.capabilities.includes("extended-thinking"))
      ) {
        score += 15;
      }

      // Bonus for research models when research category
      if (
        classification.primaryCategory === "research" &&
        modelId.startsWith("perplexity:")
      ) {
        score += 25; // Perplexity excels at research
      }

      // Quality floor - don't select terrible models
      score = Math.max(score, 10);

      return { modelId, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Get speed bonus based on model characteristics
 * NOTE: Keep bonuses moderate to avoid over-indexing on speed
 */
function getSpeedBonus(modelId: string): number {
  const config = MODEL_CONFIG[modelId];

  // Check hostOrder for fast inference providers (reduced from 30/25)
  if (config.hostOrder?.includes("cerebras")) return 12;
  if (config.hostOrder?.includes("groq")) return 10;

  // Check model name for speed indicators (reduced from 20-28)
  if (modelId.includes("flash") || modelId.includes("fast")) return 8;
  if (modelId.includes("nano") || modelId.includes("lite")) return 10;
  if (modelId.includes("lightning")) return 12;

  // Reasoning models are slower
  if (config.capabilities.includes("thinking")) return -5;
  if (config.capabilities.includes("extended-thinking")) return -8;

  return 0;
}

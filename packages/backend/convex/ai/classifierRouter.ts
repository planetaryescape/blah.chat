"use node";

/**
 * Classifier-based Model Router (v2)
 *
 * Replaces the legacy scoring router with a classification pipeline:
 * hard rules -> embedding similarity -> route label -> model bin.
 */

import { createOpenAI } from "@ai-sdk/openai";
import {
  type ClassifierConfig,
  type ClassifierRouterResult,
  classify,
  type DecisionTrace,
  MODEL_CONFIG,
  ROUTE_LABELS,
  type RouteLabel,
  SEED_EXAMPLES,
  selectFromBin,
  type TaskClassification,
} from "@blah-chat/auto-router";
import { embed, generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import { logger } from "../lib/logger";

function getEmbeddingModel() {
  const openai = createOpenAI({
    apiKey: process.env.AI_GATEWAY_API_KEY,
    baseURL:
      "https://gateway.ai.cloudflare.com/v1/planetaryescape/blah-chat-dev-gateway/openai",
  });
  return openai.textEmbeddingModel("text-embedding-3-small");
}

function getFallbackLlmModel() {
  const openai = createOpenAI({
    apiKey: process.env.AI_GATEWAY_API_KEY,
    baseURL:
      "https://gateway.ai.cloudflare.com/v1/planetaryescape/blah-chat-dev-gateway/openai",
  });
  return openai("gpt-oss-120b");
}

const EMBEDDING_PRICING = { input: 0.02, output: 0 }; // text-embedding-3-small per 1M tokens
const LLM_PRICING = { input: 0.05, output: 0.1 }; // gpt-oss-120b

/**
 * Simplified LLM fallback: given candidate labels, pick the best one.
 */
async function llmFallbackClassify(
  message: string,
  candidateLabels: RouteLabel[],
  ctx: ActionCtx,
  userId: string,
): Promise<{ routeLabel: RouteLabel; confidence: number }> {
  const labelDescriptions = candidateLabels.map((l) => `- ${l}`).join("\n");

  const response = await generateObject({
    model: getFallbackLlmModel(),
    schema: z.object({
      routeLabel: z.enum(candidateLabels as unknown as [string, ...string[]]),
      confidence: z.number().min(0).max(1),
    }),
    temperature: 0.1,
    prompt: `Classify this user message into one of these route labels:\n${labelDescriptions}\n\nUser message: "${message.slice(0, 500)}"\n\nPick the single best label.`,
  });

  if (response.usage) {
    const cost =
      ((response.usage.inputTokens ?? 0) * LLM_PRICING.input) / 1_000_000 +
      ((response.usage.outputTokens ?? 0) * LLM_PRICING.output) / 1_000_000;
    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.usage.mutations.recordTextGeneration,
      {
        userId,
        model: "openai:gpt-oss-120b",
        inputTokens: response.usage.inputTokens ?? 0,
        outputTokens: response.usage.outputTokens ?? 0,
        cost,
        feature: "classifier_router_fallback",
      },
    );
  }

  return {
    routeLabel: response.object.routeLabel as RouteLabel,
    confidence: response.object.confidence,
  };
}

/**
 * Build a TaskClassification from a route label for backward compatibility.
 */
function buildClassificationFromLabel(
  routeLabel: RouteLabel,
  confidence: number,
  hasAttachments: boolean,
  currentContextTokens: number,
): TaskClassification {
  const categoryMap: Record<RouteLabel, TaskClassification["primaryCategory"]> =
    {
      fast_cheap_chat: "conversation",
      balanced_general: "factual",
      code_heavy: "coding",
      long_context: "analysis",
      strict_json: "analysis",
      creative_writing: "creative",
      research: "research",
      vision: "multimodal",
      reasoning_complex: "reasoning",
      fallback_default: "conversation",
    };

  const complexityMap: Record<RouteLabel, TaskClassification["complexity"]> = {
    fast_cheap_chat: "simple",
    balanced_general: "moderate",
    code_heavy: "moderate",
    long_context: "complex",
    strict_json: "moderate",
    creative_writing: "moderate",
    research: "moderate",
    vision: "moderate",
    reasoning_complex: "complex",
    fallback_default: "simple",
  };

  return {
    primaryCategory: categoryMap[routeLabel],
    complexity: complexityMap[routeLabel],
    requiresVision: routeLabel === "vision" || hasAttachments,
    requiresLongContext:
      routeLabel === "long_context" || currentContextTokens > 100_000,
    requiresReasoning: routeLabel === "reasoning_complex",
    confidence,
    isHighStakes: routeLabel === "reasoning_complex" && confidence > 0.9,
    recommendedAction: "change",
  };
}

/**
 * Main classifier-based routing action.
 * Same interface as legacy routeMessage for drop-in compatibility.
 */
export const routeMessageV2 = internalAction({
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
    previousRouteLabel: v.optional(v.string()),
    excludedModels: v.optional(v.array(v.string())),
    contextBuffer: v.optional(v.number()),
    classifierConfig: v.optional(
      v.object({
        confidenceThreshold: v.optional(v.number()),
        topK: v.optional(v.number()),
        fallbackEnabled: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args): Promise<ClassifierRouterResult> => {
    const startTime = Date.now();

    try {
      const config: ClassifierConfig = {
        confidenceThreshold: args.classifierConfig?.confidenceThreshold ?? 0.82,
        marginThreshold: 0.05,
        topK: args.classifierConfig?.topK ?? 5,
        fallbackEnabled: args.classifierConfig?.fallbackEnabled ?? true,
      };

      // 1. Embed the user message
      const embeddingStart = Date.now();
      const { embedding } = await embed({
        model: getEmbeddingModel(),
        value: args.userMessage.slice(0, 8000), // Truncate for embedding
      });
      const embeddingLatencyMs = Date.now() - embeddingStart;

      // Track embedding cost
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.usage.mutations.recordEmbedding,
        {
          userId: args.userId as string,
          model: "openai:text-embedding-3-small",
          inputTokens: Math.ceil(args.userMessage.slice(0, 8000).length / 4),
          cost:
            (Math.ceil(args.userMessage.slice(0, 8000).length / 4) *
              EMBEDDING_PRICING.input) /
            1_000_000,
        },
      );

      // 2. Load examples (static seed data for now, runtime DB examples later)
      const examples = SEED_EXAMPLES.filter(
        (e): e is typeof e & { embedding: number[] } => !!e.embedding,
      ).map((e) => ({
        ...e,
        embedding: e.embedding!,
      }));

      // If no pre-computed embeddings, use fallback classification
      // In production, run compute-routing-embeddings.ts first
      let classifierResult;

      if (examples.length === 0) {
        // No embeddings available - use hard rules only, fallback to LLM
        const { runHardRules } = await import("@blah-chat/auto-router");
        const hardResult = runHardRules({
          message: args.userMessage,
          hasAttachments: args.hasAttachments,
          attachmentTypes: args.attachmentTypes,
          currentContextTokens: args.currentContextTokens,
        });

        if (hardResult) {
          classifierResult = hardResult;
        } else {
          // LLM fallback for all
          const llmResult = await llmFallbackClassify(
            args.userMessage,
            [...ROUTE_LABELS],
            ctx,
            args.userId as string,
          );
          classifierResult = {
            routeLabel: llmResult.routeLabel,
            confidence: llmResult.confidence,
            needsFallback: false,
            hardRuleMatched: undefined,
          };
        }
      } else {
        // 3. Run classifier
        classifierResult = classify({
          message: args.userMessage,
          messageEmbedding: embedding,
          examples,
          hasAttachments: args.hasAttachments,
          attachmentTypes: args.attachmentTypes,
          currentContextTokens: args.currentContextTokens,
          config,
        });
      }

      // 4. LLM fallback if needed
      let usedFallbackLlm = false;
      if (classifierResult.needsFallback && classifierResult.candidateLabels) {
        usedFallbackLlm = true;
        const llmResult = await llmFallbackClassify(
          args.userMessage,
          classifierResult.candidateLabels,
          ctx,
          args.userId as string,
        );
        classifierResult = {
          ...classifierResult,
          routeLabel: llmResult.routeLabel,
          confidence: llmResult.confidence,
          needsFallback: false,
        };
      }

      // 5. Select model from bin
      const binResult = selectFromBin({
        routeLabel: classifierResult.routeLabel,
        preferences: args.preferences,
        previousModelId: args.previousSelectedModel,
        previousRouteLabel: args.previousRouteLabel as RouteLabel | undefined,
        excludedModels: args.excludedModels,
        currentContextTokens: args.currentContextTokens,
        requiresVision:
          classifierResult.routeLabel === "vision" || args.hasAttachments,
        contextBuffer: args.contextBuffer,
      });

      // 6. Build backward-compatible classification
      const classification = buildClassificationFromLabel(
        classifierResult.routeLabel,
        classifierResult.confidence,
        args.hasAttachments,
        args.currentContextTokens ?? 0,
      );

      // 7. Generate reasoning
      const modelConfig = MODEL_CONFIG[binResult.modelId];
      const reasoning = modelConfig
        ? `${modelConfig.name} selected for ${classifierResult.routeLabel.replace(/_/g, " ")} (confidence: ${(classifierResult.confidence * 100).toFixed(0)}%)`
        : `Model ${binResult.modelId} selected`;

      // 8. Build decision trace
      const trace: DecisionTrace = {
        routerMode: "classifier",
        hardRuleMatched: classifierResult.hardRuleMatched,
        topSimilarityScore: classifierResult.topSimilarityScore,
        topRouteLabel: classifierResult.routeLabel,
        secondRouteLabel: classifierResult.secondRouteLabel,
        secondSimilarityScore: classifierResult.secondSimilarityScore,
        usedFallbackLlm,
        embeddingLatencyMs,
        totalLatencyMs: Date.now() - startTime,
        candidateModels: binResult.candidateModels,
      };

      logger.info("Classifier router selected model", {
        tag: "ClassifierRouter",
        conversationId: args.conversationId,
        selectedModel: binResult.modelId,
        routeLabel: classifierResult.routeLabel,
        confidence: classifierResult.confidence,
        hardRuleMatched: classifierResult.hardRuleMatched,
        usedFallbackLlm,
        isSticky: binResult.isSticky,
        embeddingLatencyMs,
        totalLatencyMs: Date.now() - startTime,
      });

      return {
        selectedModelId: binResult.modelId,
        classification,
        reasoning,
        candidatesConsidered: binResult.candidatesConsidered,
        isSticky: binResult.isSticky,
        routeLabel: classifierResult.routeLabel,
        classifierVersion: "classifier_v1",
        trace,
      };
    } catch (error) {
      logger.error("Classifier router error, falling back to default", {
        tag: "ClassifierRouter",
        error: String(error),
      });

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
        reasoning: "Classifier routing failed, using default model",
        candidatesConsidered: 0,
        classifierVersion: "classifier_v1",
      };
    }
  },
});

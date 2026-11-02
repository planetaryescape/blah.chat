"use node";

/**
 * Auto Model Router
 *
 * Thin wrapper that forwards to the classifier-based router.
 * The classifier uses embedding similarity + hard rules to select the optimal model.
 */

import { DEFAULT_MODEL_ID } from "@blah-chat/ai/models";
import type { RouterResult } from "@blah-chat/auto-router";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { logger } from "../lib/logger";

function directTextFallback(reasoning: string): RouterResult {
  return {
    selectedModelId: DEFAULT_MODEL_ID,
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
    reasoning,
    candidatesConsidered: 1,
  };
}

/**
 * Main routing action - forwards to classifier router.
 *
 * Called from generation.ts when user has "auto" selected as their model.
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
    // Direct text inference remains usable without paid embedding/classifier services.
    if (process.env.GROQ_API_KEY || process.env.CEREBRAS_API_KEY) {
      return directTextFallback(
        "Using the available direct GPT-OSS text model; semantic routing is temporarily unavailable.",
      );
    }

    try {
      // Read classifier-specific config from DB
      const routerConfig = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        api.models.queries.getRouterConfig,
        {},
      )) as {
        contextBuffer?: number;
        classifierConfidenceThreshold?: number;
        classifierTopK?: number;
        classifierFallbackEnabled?: boolean;
      } | null;

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
          contextBuffer: routerConfig?.contextBuffer,
          classifierConfig: {
            confidenceThreshold:
              routerConfig?.classifierConfidenceThreshold ?? 0.82,
            topK: routerConfig?.classifierTopK ?? 5,
            fallbackEnabled: routerConfig?.classifierFallbackEnabled ?? true,
          },
        },
      )) as RouterResult;

      return classifierResult;
    } catch (error) {
      logger.error("Auto router error", {
        tag: "AutoRouter",
        error: String(error),
      });

      return directTextFallback(
        "Routing failed, using the direct text default model",
      );
    }
  },
});

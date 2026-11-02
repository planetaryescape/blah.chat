"use node";

/**
 * Auto Model Router
 *
 * Thin wrapper that forwards to the classifier-based router.
 * The classifier uses embedding similarity + hard rules to select the optimal model.
 */

import type { RouterResult } from "@blah-chat/auto-router";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { logger } from "../lib/logger";

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

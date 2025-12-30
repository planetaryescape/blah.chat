import { embed } from "ai";
import { v } from "convex/values";
import {
  calculateEmbeddingCost,
  EMBEDDING_MODEL,
  EMBEDDING_PRICING,
} from "@/lib/ai/operational-models";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { isMemoryDuplicate } from "../lib/utils/memory";
import { estimateTokens } from "../tokens/counting";

/**
 * Save a memory from LLM tool call.
 * Used when user explicitly asks to remember something or LLM identifies important info.
 */
export const saveFromTool = internalAction({
  args: {
    userId: v.id("users"),
    content: v.string(),
    category: v.string(),
    reasoning: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    message: string;
    memoryId?: Id<"memories">;
    duplicate?: boolean;
  }> => {
    try {
      // 1. Generate embedding for the content
      const tokenCount = estimateTokens(args.content);
      const embeddingResult = await embed({
        model: EMBEDDING_MODEL,
        value: args.content,
      });

      // Track embedding cost
      await ctx.scheduler.runAfter(
        0,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.usage.mutations.recordEmbedding,
        {
          userId: args.userId,
          model: EMBEDDING_PRICING.model,
          tokenCount,
          cost: calculateEmbeddingCost(tokenCount),
          feature: "memory",
        },
      );

      // 2. Check for duplicates
      const duplicateCheck = await isMemoryDuplicate(
        ctx,
        args.userId,
        embeddingResult.embedding,
      );

      if (duplicateCheck.isDuplicate) {
        return {
          success: false,
          duplicate: true,
          message: `This information is already saved: "${duplicateCheck.similarContent?.slice(0, 100)}..."`,
        };
      }

      // 3. Store the memory with high importance (explicit save = important)
      const memoryId = await ctx.runMutation(internal.memories.create, {
        userId: args.userId,
        content: args.content,
        embedding: embeddingResult.embedding,
        metadata: {
          category: args.category,
          importance: 9, // Explicit saves are highly important
          reasoning: args.reasoning,
          confidence: 1.0, // Explicit save = 100% confident
          verifiedBy: "manual", // Treat tool-initiated as verified
          version: 1,
          expirationHint: "preference", // Default to never expire
          extractedAt: Date.now(),
        },
      });

      console.log(
        `[Memory] Saved via tool: "${args.content.slice(0, 50)}..." (${args.category})`,
      );

      return {
        success: true,
        message: `Saved to memory: "${args.content}"`,
        memoryId,
      };
    } catch (error) {
      console.error("[Memory] Tool save failed:", error);
      return {
        success: false,
        message: `Failed to save memory: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

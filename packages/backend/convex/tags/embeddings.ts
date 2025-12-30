/**
 * Tag Embeddings Module
 *
 * Handles embedding generation for semantic tag matching.
 * Embeddings are generated lazily on-demand during first match check.
 */

import { embed } from "ai";
import { v } from "convex/values";
import {
  calculateEmbeddingCost,
  EMBEDDING_MODEL,
  EMBEDDING_PRICING,
} from "@/lib/ai/operational-models";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction, internalMutation } from "../_generated/server";
import { estimateTokens } from "../tokens/counting";

/**
 * Generate and store embedding for a tag (lazy generation)
 * Embeds: "slug displayName" for better semantic understanding
 */
export const generateTagEmbedding = internalAction({
  args: { tagId: v.id("tags") },
  handler: async (ctx, { tagId }) => {
    // Get tag
    const tag = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getTag,
      { tagId },
    )) as Doc<"tags"> | null;

    if (!tag) {
      console.warn(`[Embeddings] Tag ${tagId} not found`);
      return;
    }

    // Skip if already has embedding
    if (tag.embedding && tag.embedding.length > 0) {
      return;
    }

    try {
      // Embed: "slug displayName" for richer semantic context
      // e.g., "machine-learning Machine Learning" captures both forms
      const text = `${tag.slug} ${tag.displayName}`;
      const tokenCount = estimateTokens(text);

      const { embedding } = await embed({
        model: EMBEDDING_MODEL,
        value: text,
      });

      // Track embedding cost (only for user-owned tags)
      if (tag.userId) {
        await ctx.scheduler.runAfter(
          0,
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.usage.mutations.recordEmbedding,
          {
            userId: tag.userId,
            model: EMBEDDING_PRICING.model,
            tokenCount,
            cost: calculateEmbeddingCost(tokenCount),
            feature: "notes",
          },
        );
      }

      // Store embedding
      (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.tags.embeddings.updateEmbedding,
        { tagId, embedding },
      )) as Promise<void>;

      console.log(
        `[Embeddings] Generated for tag "${tag.displayName}" (${tagId})`,
      );
    } catch (error) {
      console.error(`[Embeddings] Failed to generate for tag ${tagId}:`, error);
    }
  },
});

/**
 * Internal mutation to update tag embedding
 */
export const updateEmbedding = internalMutation({
  args: {
    tagId: v.id("tags"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, { tagId, embedding }) => {
    await ctx.db.patch(tagId, {
      embedding,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Calculate cosine similarity between two embeddings
 * Returns value between 0 (unrelated) and 1 (identical)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have same length");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

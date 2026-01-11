import { embed } from "ai";
import { v } from "convex/values";
import {
  calculateEmbeddingCost,
  EMBEDDING_MODEL,
  EMBEDDING_PRICING,
} from "@/lib/ai/operational-models";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { logger } from "../lib/logger";
import { estimateTokens } from "../tokens/counting";

// text-embedding-3-small has 8192 token limit (~4 chars/token on average)
const MAX_EMBEDDING_CHARS = 28000; // ~7000 tokens

/**
 * Generate embeddings for a presentation (triggered after outline approval)
 * Combines: title + description + outline content
 */
export const generateEmbedding = internalAction({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    // Get presentation
    const presentation = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.presentations.internal.getPresentationInternal,
      { presentationId: args.presentationId },
    )) as {
      userId: Id<"users">;
      title: string;
      description?: string;
      currentOutlineVersion?: number;
    } | null;

    if (!presentation) {
      logger.error("Presentation not found", {
        tag: "Embeddings",
        presentationId: args.presentationId,
      });
      return;
    }

    // Get outline items for current version
    const version = presentation.currentOutlineVersion ?? 1;
    const outlineItems = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.presentations.outline.getOutlineItemsInternal,
      { presentationId: args.presentationId, version },
    )) as Array<{ title: string; content: string }> | null;

    // Build text to embed: title + description + outline content
    const outlineText = outlineItems
      ? outlineItems.map((item) => `${item.title}: ${item.content}`).join("\n")
      : "";

    const textToEmbed = [
      presentation.title,
      presentation.description || "",
      outlineText,
    ]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    if (textToEmbed.length === 0) {
      return; // Skip empty presentations
    }

    try {
      // Truncate if too long
      const contentToEmbed =
        textToEmbed.length > MAX_EMBEDDING_CHARS
          ? textToEmbed.slice(0, MAX_EMBEDDING_CHARS)
          : textToEmbed;

      const tokenCount = estimateTokens(contentToEmbed);

      // Generate embedding
      const { embedding } = await embed({
        model: EMBEDDING_MODEL,
        value: contentToEmbed,
      });

      // Track embedding cost
      await ctx.scheduler.runAfter(
        0,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.usage.mutations.recordEmbedding,
        {
          userId: presentation.userId,
          model: EMBEDDING_PRICING.model,
          tokenCount,
          cost: calculateEmbeddingCost(tokenCount),
          feature: "slides",
        },
      );

      // Store embedding
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.embeddings.updateEmbedding,
        {
          presentationId: args.presentationId,
          embedding,
        },
      );
    } catch (error) {
      logger.error("Failed to generate embedding for presentation", {
        tag: "Embeddings",
        presentationId: args.presentationId,
        error: String(error),
      });
    }
  },
});

/**
 * Batch generate embeddings for existing presentations (migration/backfill)
 */
export const generateBatchEmbeddings = internalAction({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ done: boolean; processed: number; total?: number }> => {
    const batchSize = args.batchSize || 50;

    // Get presentations without embeddings
    const result = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.presentations.embeddings.getPresentationsWithoutEmbeddings,
      {
        cursor: args.cursor,
        limit: batchSize,
      },
    )) as {
      presentations: Array<{ _id: string }>;
      continueCursor: string | null;
      total: number;
    };

    if (result.presentations.length === 0) {
      return { done: true, processed: 0 };
    }

    // Generate embeddings for each presentation
    for (const presentation of result.presentations) {
      try {
        // Use the single embedding generator (handles all the logic)
        await (ctx.runAction as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.presentations.embeddings.generateEmbedding,
          { presentationId: presentation._id },
        );
      } catch (error) {
        logger.error("Failed to embed presentation", {
          tag: "Embeddings",
          presentationId: presentation._id,
          error: String(error),
        });
      }
    }

    // Schedule next batch if there are more
    if (result.continueCursor) {
      await ctx.scheduler.runAfter(
        1000,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.embeddings.generateBatchEmbeddings,
        {
          cursor: result.continueCursor,
          batchSize,
        },
      );
    }

    return {
      done: !result.continueCursor,
      processed: result.presentations.length,
      total: result.total,
    };
  },
});

export const updateEmbedding = internalMutation({
  args: {
    presentationId: v.id("presentations"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.presentationId, {
      embedding: args.embedding,
      updatedAt: Date.now(),
    });
  },
});

export const getPresentationsWithoutEmbeddings = internalQuery({
  args: {
    cursor: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("presentations")
      .filter((q) => q.eq(q.field("embedding"), undefined))
      .paginate({ cursor: args.cursor || null, numItems: args.limit });

    // Get total count
    const total = await ctx.db
      .query("presentations")
      .filter((q) => q.eq(q.field("embedding"), undefined))
      .collect()
      .then((presentations) => presentations.length);

    return {
      presentations: result.page,
      continueCursor: result.continueCursor,
      total,
    };
  },
});

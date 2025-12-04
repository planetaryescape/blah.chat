import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import type { Id } from "../_generated/dataModel";

/**
 * Generate embeddings for new messages (triggered after message creation)
 */
export const generateEmbedding = internalAction({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.content || args.content.trim().length === 0) {
      return; // Skip empty messages
    }

    try {
      // Generate embedding
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: args.content,
      });

      // Store embedding
      await ctx.runMutation(internal.messages.embeddings.updateEmbedding, {
        messageId: args.messageId,
        embedding,
      });
    } catch (error) {
      console.error(
        "Failed to generate embedding for message:",
        args.messageId,
        error,
      );
      // Don't throw - embedding generation is non-critical
    }
  },
});

/**
 * Batch generate embeddings for existing messages (migration/retroactive)
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

    // Get messages without embeddings
    const result: any = await ctx.runQuery(
      internal.messages.embeddings.getMessagesWithoutEmbeddings,
      {
        cursor: args.cursor,
        limit: batchSize,
      },
    );

    if (result.messages.length === 0) {
      return { done: true, processed: 0 };
    }

    // Filter out empty messages
    const validMessages = result.messages.filter(
      (m: any) => m.content && m.content.trim().length > 0,
    );

    if (validMessages.length === 0) {
      // All messages were empty, schedule next batch
      if (result.continueCursor) {
        await ctx.scheduler.runAfter(
          1000,
          internal.messages.embeddings.generateBatchEmbeddings,
          {
            cursor: result.continueCursor,
            batchSize,
          },
        );
      }
      return { done: !result.continueCursor, processed: 0 };
    }

    // Generate embeddings individually (embed doesn't support batch)
    for (const msg of validMessages) {
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: msg.content!,
      });

      await ctx.runMutation(internal.messages.embeddings.updateEmbedding, {
        messageId: msg._id,
        embedding,
      });
    }

    // Schedule next batch if there are more messages
    if (result.continueCursor) {
      await ctx.scheduler.runAfter(
        1000,
        internal.messages.embeddings.generateBatchEmbeddings,
        {
          cursor: result.continueCursor,
          batchSize,
        },
      );
    }

    return {
      done: !result.continueCursor,
      processed: validMessages.length,
      total: result.total,
    };
  },
});

export const updateEmbedding = internalMutation({
  args: {
    messageId: v.id("messages"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      embedding: args.embedding,
    });
  },
});

export const getMessagesWithoutEmbeddings = internalQuery({
  args: {
    cursor: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("embedding"), undefined))
      .paginate({ cursor: args.cursor || null, numItems: args.limit });

    // Get total count
    const total = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("embedding"), undefined))
      .collect()
      .then((msgs) => msgs.length);

    return {
      messages: result.page,
      continueCursor: result.continueCursor,
      total,
    };
  },
});

import { openai } from "@ai-sdk/openai";
import { embed, generateText } from "ai";
import { v } from "convex/values";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import { EMBEDDING_SUMMARIZATION_MODEL } from "../../src/lib/ai/operational-models";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

const EMBEDDING_MODEL = "text-embedding-3-small"; // OpenAI embedding model

// text-embedding-3-small has 8192 token limit (~4 chars/token on average)
const MAX_EMBEDDING_CHARS = 28000; // ~7000 tokens

/**
 * Summarize large text for embedding using GPT-OSS 120B
 */
async function summarizeForEmbedding(text: string): Promise<string> {
  try {
    const result = await generateText({
      model: getModel(EMBEDDING_SUMMARIZATION_MODEL.id),
      providerOptions: getGatewayOptions(
        EMBEDDING_SUMMARIZATION_MODEL.id,
        undefined,
        ["embedding-summarize"],
      ),
      maxOutputTokens: 500,
      prompt:
        "Summarize this text in 2-3 sentences, preserving the key topics and information for semantic search:\n\n" +
        text.slice(0, 15000),
    });
    return result.text || text.slice(0, MAX_EMBEDDING_CHARS);
  } catch {
    // Fallback to truncation if summarization fails
    return text.slice(0, MAX_EMBEDDING_CHARS);
  }
}

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
      // For large messages, summarize first using GPT-OSS 120B
      let contentToEmbed = args.content;
      if (args.content.length > MAX_EMBEDDING_CHARS) {
        console.log(
          `Message ${args.messageId} too large (${args.content.length} chars), summarizing...`,
        );
        contentToEmbed = await summarizeForEmbedding(args.content);
      }

      // Generate embedding
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: contentToEmbed,
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

    // Generate embeddings individually
    for (const msg of validMessages) {
      // Summarize large messages first
      let contentToEmbed = msg.content!;
      if (contentToEmbed.length > MAX_EMBEDDING_CHARS) {
        contentToEmbed = await summarizeForEmbedding(contentToEmbed);
      }

      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: contentToEmbed,
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

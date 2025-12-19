import { embed } from "ai";
import { v } from "convex/values";
import { EMBEDDING_MODEL } from "../../src/lib/ai/operational-models";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

// text-embedding-3-small has 8192 token limit (~4 chars/token on average)
const MAX_EMBEDDING_CHARS = 28000; // ~7000 tokens

/**
 * Generate embeddings for a note (triggered after note creation/update)
 */
export const generateEmbedding = internalAction({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    // Get note content
    const note = (await ctx.runQuery(internal.notes.getInternal, {
      noteId: args.noteId,
    })) as { title: string; content: string } | null;

    if (!note) {
      console.error("Note not found:", args.noteId);
      return;
    }

    // Combine title + content for embedding
    const textToEmbed = `${note.title}\n\n${note.content}`.trim();

    if (textToEmbed.length === 0) {
      return; // Skip empty notes
    }

    // Mark as processing
    await ctx.runMutation(internal.notes.embeddings.updateEmbeddingStatus, {
      noteId: args.noteId,
      status: "processing",
    });

    try {
      // Truncate if too long
      const contentToEmbed =
        textToEmbed.length > MAX_EMBEDDING_CHARS
          ? textToEmbed.slice(0, MAX_EMBEDDING_CHARS)
          : textToEmbed;

      // Generate embedding
      const { embedding } = await embed({
        model: EMBEDDING_MODEL,
        value: contentToEmbed,
      });

      // Store embedding
      await ctx.runMutation(internal.notes.embeddings.updateEmbedding, {
        noteId: args.noteId,
        embedding,
      });
    } catch (error) {
      console.error("Failed to generate embedding for note:", args.noteId, error);
      await ctx.runMutation(internal.notes.embeddings.updateEmbeddingStatus, {
        noteId: args.noteId,
        status: "failed",
      });
    }
  },
});

/**
 * Batch generate embeddings for existing notes (migration/backfill)
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

    // Get notes without embeddings
    const result = (await ctx.runQuery(
      internal.notes.embeddings.getNotesWithoutEmbeddings,
      {
        cursor: args.cursor,
        limit: batchSize,
      },
    )) as {
      notes: Array<{ _id: string; title: string; content: string }>;
      continueCursor: string | null;
      total: number;
    };

    if (result.notes.length === 0) {
      return { done: true, processed: 0 };
    }

    // Generate embeddings for each note
    for (const note of result.notes) {
      const textToEmbed = `${note.title}\n\n${note.content}`.trim();

      if (textToEmbed.length === 0) {
        continue;
      }

      try {
        const contentToEmbed =
          textToEmbed.length > MAX_EMBEDDING_CHARS
            ? textToEmbed.slice(0, MAX_EMBEDDING_CHARS)
            : textToEmbed;

        const { embedding } = await embed({
          model: EMBEDDING_MODEL,
          value: contentToEmbed,
        });

        await ctx.runMutation(internal.notes.embeddings.updateEmbedding, {
          noteId: note._id as any,
          embedding,
        });
      } catch (error) {
        console.error("Failed to embed note:", note._id, error);
        await ctx.runMutation(internal.notes.embeddings.updateEmbeddingStatus, {
          noteId: note._id as any,
          status: "failed",
        });
      }
    }

    // Schedule next batch if there are more
    if (result.continueCursor) {
      await ctx.scheduler.runAfter(
        1000,
        internal.notes.embeddings.generateBatchEmbeddings,
        {
          cursor: result.continueCursor,
          batchSize,
        },
      );
    }

    return {
      done: !result.continueCursor,
      processed: result.notes.length,
      total: result.total,
    };
  },
});

export const updateEmbedding = internalMutation({
  args: {
    noteId: v.id("notes"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, {
      embedding: args.embedding,
      embeddingStatus: "completed",
    });
  },
});

export const updateEmbeddingStatus = internalMutation({
  args: {
    noteId: v.id("notes"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, {
      embeddingStatus: args.status,
    });
  },
});

export const getNotesWithoutEmbeddings = internalQuery({
  args: {
    cursor: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("notes")
      .filter((q) => q.eq(q.field("embedding"), undefined))
      .paginate({ cursor: args.cursor || null, numItems: args.limit });

    // Get total count
    const total = await ctx.db
      .query("notes")
      .filter((q) => q.eq(q.field("embedding"), undefined))
      .collect()
      .then((notes) => notes.length);

    return {
      notes: result.page,
      continueCursor: result.continueCursor,
      total,
    };
  },
});

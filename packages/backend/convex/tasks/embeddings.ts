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
import { estimateTokens } from "../tokens/counting";

// text-embedding-3-small has 8192 token limit (~4 chars/token on average)
const MAX_EMBEDDING_CHARS = 28000; // ~7000 tokens

/**
 * Generate embeddings for a task (triggered after task creation/update)
 */
export const generateEmbedding = internalAction({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    // Get task content
    const task = (await ctx.runQuery(
      internal.tasks.embeddings.getTaskInternal,
      {
        taskId: args.taskId,
      },
    )) as {
      title: string;
      description?: string;
      userId: Id<"users">;
    } | null;

    if (!task) {
      console.error("Task not found:", args.taskId);
      return;
    }

    // Combine title + description for embedding
    const textToEmbed = task.description
      ? `${task.title}\n\n${task.description}`.trim()
      : task.title.trim();

    if (textToEmbed.length === 0) {
      return; // Skip empty tasks
    }

    // Mark as processing
    await ctx.runMutation(internal.tasks.embeddings.updateEmbeddingStatus, {
      taskId: args.taskId,
      status: "processing",
    });

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
          userId: task.userId,
          model: EMBEDDING_PRICING.model,
          tokenCount,
          cost: calculateEmbeddingCost(tokenCount),
          feature: "tasks",
        },
      );

      // Store embedding
      await ctx.runMutation(internal.tasks.embeddings.updateEmbedding, {
        taskId: args.taskId,
        embedding,
      });
    } catch (error) {
      console.error(
        "Failed to generate embedding for task:",
        args.taskId,
        error,
      );
      await ctx.runMutation(internal.tasks.embeddings.updateEmbeddingStatus, {
        taskId: args.taskId,
        status: "failed",
      });
    }
  },
});

/**
 * Batch generate embeddings for existing tasks (migration/backfill)
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

    // Get tasks without embeddings
    const result = (await ctx.runQuery(
      internal.tasks.embeddings.getTasksWithoutEmbeddings,
      {
        cursor: args.cursor,
        limit: batchSize,
      },
    )) as {
      tasks: Array<{
        _id: string;
        title: string;
        description?: string;
        userId: Id<"users">;
      }>;
      continueCursor: string | null;
      total: number;
    };

    if (result.tasks.length === 0) {
      return { done: true, processed: 0 };
    }

    // Generate embeddings for each task
    for (const task of result.tasks) {
      const textToEmbed = task.description
        ? `${task.title}\n\n${task.description}`.trim()
        : task.title.trim();

      if (textToEmbed.length === 0) {
        continue;
      }

      try {
        const contentToEmbed =
          textToEmbed.length > MAX_EMBEDDING_CHARS
            ? textToEmbed.slice(0, MAX_EMBEDDING_CHARS)
            : textToEmbed;

        const tokenCount = estimateTokens(contentToEmbed);

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
            userId: task.userId,
            model: EMBEDDING_PRICING.model,
            tokenCount,
            cost: calculateEmbeddingCost(tokenCount),
            feature: "tasks",
          },
        );

        await ctx.runMutation(internal.tasks.embeddings.updateEmbedding, {
          taskId: task._id as any,
          embedding,
        });
      } catch (error) {
        console.error("Failed to embed task:", task._id, error);
        await ctx.runMutation(internal.tasks.embeddings.updateEmbeddingStatus, {
          taskId: task._id as any,
          status: "failed",
        });
      }
    }

    // Schedule next batch if there are more
    if (result.continueCursor) {
      await ctx.scheduler.runAfter(
        1000,
        internal.tasks.embeddings.generateBatchEmbeddings,
        {
          cursor: result.continueCursor,
          batchSize,
        },
      );
    }

    return {
      done: !result.continueCursor,
      processed: result.tasks.length,
      total: result.total,
    };
  },
});

export const getTaskInternal = internalQuery({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

export const updateEmbedding = internalMutation({
  args: {
    taskId: v.id("tasks"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      embedding: args.embedding,
      embeddingStatus: "completed",
    });
  },
});

export const updateEmbeddingStatus = internalMutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      embeddingStatus: args.status,
    });
  },
});

export const getTasksWithoutEmbeddings = internalQuery({
  args: {
    cursor: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("embedding"), undefined))
      .paginate({ cursor: args.cursor || null, numItems: args.limit });

    // Get total count
    const total = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("embedding"), undefined))
      .collect()
      .then((tasks) => tasks.length);

    return {
      tasks: result.page,
      continueCursor: result.continueCursor,
      total,
    };
  },
});

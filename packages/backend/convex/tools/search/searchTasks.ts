/**
 * Backend Action: Search Tasks
 *
 * Hybrid search (vector + keyword + status filter) on tasks with optional projectId filter.
 * Works with or without projectId:
 * - With projectId: Search only that project's tasks
 * - Without projectId: Search ALL user's tasks
 */

import { embed } from "ai";
import { v } from "convex/values";
import { EMBEDDING_MODEL } from "@/lib/ai/operational-models";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalAction, internalQuery } from "../../_generated/server";

/**
 * Filter tasks by user and optional project/status
 */
export const filterTasks = internalQuery({
  args: {
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    status: v.optional(
      v.union(
        v.literal("suggested"),
        v.literal("confirmed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Query by project if provided, otherwise by user
    let query;
    if (args.projectId) {
      query = ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId));
    } else {
      query = ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", args.userId));
    }

    // Apply status filter if provided
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    return await query.order("desc").take(args.limit);
  },
});

export const searchTasks = internalAction({
  args: {
    userId: v.id("users"),
    query: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    status: v.optional(
      v.union(
        v.literal("suggested"),
        v.literal("confirmed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // If no query, just filter by status/project
    if (!args.query) {
      const tasks = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.tools.search.searchTasks.filterTasks,
        {
          userId: args.userId,
          projectId: args.projectId,
          status: args.status,
          limit: args.limit,
        },
      )) as Doc<"tasks">[];

      return formatTaskResults(tasks, args.projectId, args.status);
    }

    // With query: use vector search
    const { embedding: queryEmbedding } = await embed({
      model: EMBEDDING_MODEL,
      value: args.query,
    });

    // Vector search with optional projectId filter
    const vectorResults = await ctx.vectorSearch("tasks", "by_embedding", {
      vector: queryEmbedding,
      limit: args.limit * 2, // Over-fetch for filtering
      filter: args.projectId
        ? (q: any) =>
            q.eq("userId", args.userId).eq("projectId", args.projectId)
        : (q: any) => q.eq("userId", args.userId),
    });

    if (vectorResults.length === 0) {
      // Fallback to keyword search
      const tasks = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.tools.search.searchTasks.filterTasks,
        {
          userId: args.userId,
          projectId: args.projectId,
          status: args.status,
          limit: args.limit * 2,
        },
      )) as Doc<"tasks">[];

      // Filter by keyword
      const queryLower = args.query.toLowerCase();
      const filtered = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(queryLower) ||
          t.description?.toLowerCase().includes(queryLower),
      );

      return formatTaskResults(
        filtered.slice(0, args.limit),
        args.projectId,
        args.status,
      );
    }

    // Fetch full task documents
    const tasks: Array<Doc<"tasks"> & { score: number }> = [];
    for (const result of vectorResults) {
      const task = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.lib.helpers.getTask,
        { taskId: result._id },
      )) as Doc<"tasks"> | null;

      if (task?.embedding) {
        // Apply status filter if provided
        if (args.status && task.status !== args.status) {
          continue;
        }

        const score = cosineSimilarity(queryEmbedding, task.embedding);
        tasks.push({ ...task, score });
      }
    }

    // Sort by score and take top results
    const sortedTasks = tasks
      .sort((a, b) => b.score - a.score)
      .slice(0, args.limit);

    return formatTaskResults(sortedTasks, args.projectId, args.status, true);
  },
});

function formatTaskResults(
  tasks: Array<Doc<"tasks"> & { score?: number }>,
  projectId: Id<"projects"> | undefined,
  status: string | undefined,
  includeScore = false,
) {
  if (tasks.length === 0) {
    let message = "No tasks found";
    if (projectId && status) {
      message = `No ${status} tasks found in project`;
    } else if (projectId) {
      message = "No tasks found in project";
    } else if (status) {
      message = `No ${status} tasks found`;
    }

    return {
      success: true,
      results: [],
      message,
    };
  }

  const results = tasks.map((t) => ({
    id: t._id,
    projectId: t.projectId || null,
    title: t.title,
    status: t.status,
    urgency: t.urgency || "medium",
    deadline: t.deadline ? new Date(t.deadline).toISOString() : null,
    description: t.description?.slice(0, 200),
    ...(includeScore && t.score !== undefined
      ? { score: t.score.toFixed(3) }
      : {}),
    url: t.projectId
      ? `/projects/${t.projectId}/tasks?task=${t._id}`
      : `/tasks?task=${t._id}`,
  }));

  return {
    success: true,
    results,
    totalResults: tasks.length,
  };
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

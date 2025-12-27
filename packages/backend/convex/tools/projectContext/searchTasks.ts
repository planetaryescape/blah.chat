/**
 * Backend Action: Search Project Tasks
 *
 * Searches tasks with optional status filter and keyword search.
 * Uses structured data (no semantic search needed for tasks).
 */

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";

export const searchTasks = internalAction({
  args: {
    conversationId: v.id("conversations"),
    query: v.optional(v.string()),
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
    // 1. Get project via conversation
    const conversation = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getConversation,
      { id: args.conversationId },
    )) as Doc<"conversations"> | null;

    if (!conversation?.projectId) {
      return {
        success: true,
        results: [],
        message: "No project associated with this conversation",
      };
    }

    // 2. Query tasks with filters
    const tasks = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.tools.projectContext.helpers.filterTasks,
      {
        projectId: conversation.projectId,
        status: args.status,
        limit: args.limit,
      },
    )) as Doc<"tasks">[];

    if (tasks.length === 0) {
      return {
        success: true,
        results: [],
        message: args.status
          ? `No ${args.status} tasks found in project`
          : "No tasks found in project",
      };
    }

    // 3. Keyword filter if provided
    let filteredTasks = tasks;
    if (args.query) {
      const queryLower = args.query.toLowerCase();
      filteredTasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(queryLower) ||
          t.description?.toLowerCase().includes(queryLower),
      );
    }

    if (filteredTasks.length === 0) {
      return {
        success: true,
        results: [],
        message: `No tasks matching "${args.query}" found`,
      };
    }

    // 4. Format results (truncate description to 200 chars)
    const results = filteredTasks.map((t) => ({
      title: t.title,
      status: t.status,
      urgency: t.urgency || "medium",
      deadline: t.deadline ? new Date(t.deadline).toISOString() : null,
      description: t.description?.slice(0, 200),
    }));

    return {
      success: true,
      results,
      totalResults: filteredTasks.length,
    };
  },
});

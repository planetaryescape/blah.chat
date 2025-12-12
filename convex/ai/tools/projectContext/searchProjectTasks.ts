/**
 * Project Context Tool: Search Project Tasks
 *
 * Filtered search across tasks in current project.
 * Supports status filtering and keyword search.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import { internal } from "../../../_generated/api";

export function createSearchProjectTasksTool(
  ctx: ActionCtx,
  conversationId: Id<"conversations">,
) {
  return tool({
    description: `Search tasks in the current project by status, keyword, or list all.

✅ USE FOR:
- Finding active work items
- Listing completed tasks
- Finding upcoming deadlines
- Searching tasks by keyword
- Filtering tasks by status

❌ DO NOT USE FOR:
- Creating or updating tasks
- Searching notes (use searchProjectNotes)
- Searching files (use searchProjectFiles)`,
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe("Optional keyword search in task titles/descriptions"),
      status: z
        .enum([
          "suggested",
          "confirmed",
          "in_progress",
          "completed",
          "cancelled",
        ])
        .optional()
        .describe("Optional status filter"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Number of results to return (1-20, default: 10)"),
    }),
    execute: async ({ query, status, limit = 10 }) => {
      return await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.tools.projectContext.searchTasks,
        { conversationId, query, status, limit },
      );
    },
  });
}

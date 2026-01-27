/**
 * Search Tool: Search Tasks
 *
 * Hybrid search (vector + keyword + status filter) across tasks.
 * Works with or without projectId filter.
 */

import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";

export function createSearchTasksTool(ctx: ActionCtx, userId: Id<"users">) {
  return tool({
    description: `Search tasks stored in this app only. For external services (calendars, email, etc), use the UPPERCASE service tools instead.

Parameters:
- query: Optional search text
- projectId: Optional project filter
- status: Optional status filter
- limit: Results (1-20, default: 10)`,
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe("Optional search query for task titles/descriptions"),
      projectId: z
        .string()
        .optional()
        .describe(
          "Optional project ID to filter results to a specific project",
        ),
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
        .min(1)
        .max(20)
        .optional()
        .default(10)
        .describe("Number of results to return (1-20, default: 10)"),
    }),
    execute: async ({ query, projectId, status, limit = 10 }) => {
      try {
        return await (ctx.runAction as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.tools.search.searchTasks.searchTasks,
          {
            userId,
            query,
            projectId: projectId as Id<"projects"> | undefined,
            status,
            limit,
          },
        );
      } catch (error: any) {
        // Handle invalid projectId (e.g., conversationId passed by mistake)
        if (error.message?.includes("does not match the table name")) {
          return {
            success: false,
            error:
              "Invalid projectId - the ID provided is not a valid project ID",
            results: [],
          };
        }
        throw error;
      }
    },
  });
}

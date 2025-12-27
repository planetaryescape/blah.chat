/**
 * Search Tool: Search All
 *
 * Unified search across files, notes, tasks, and conversation history.
 * Runs parallel searches and merges results with source attribution.
 * Works with or without projectId filter.
 */

import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";

export function createSearchAllTool(
  ctx: ActionCtx,
  userId: Id<"users">,
  currentConversationId?: Id<"conversations">,
) {
  return tool({
    description: `Search across ALL resource types (files, notes, tasks, conversations) in one call.

✅ USE FOR:
- Finding information when you don't know which resource type contains it
- Getting comprehensive context across all sources
- Answering questions that might span multiple resource types

Parameters:
- query: What to search for (required)
- projectId: Optional - filter to specific project, omit to search all resources
- resourceTypes: Optional - which types to search (default: all)
- limit: Results per type (1-10, default: 3)`,
    inputSchema: z.object({
      query: z.string().describe("What to search for across all resources"),
      projectId: z
        .string()
        .optional()
        .describe(
          "Optional project ID to filter results to a specific project",
        ),
      resourceTypes: z
        .array(z.enum(["files", "notes", "tasks", "conversations"]))
        .optional()
        .default(["files", "notes", "tasks", "conversations"])
        .describe("Which resource types to search (default: all)"),
      limit: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(3)
        .describe("Number of results per resource type (1-10, default: 3)"),
    }),
    execute: async ({
      query,
      projectId,
      resourceTypes = ["files", "notes", "tasks", "conversations"],
      limit = 3,
    }) => {
      try {
        return await (ctx.runAction as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.tools.search.searchAll.searchAll,
          {
            userId,
            query,
            projectId: projectId as Id<"projects"> | undefined,
            resourceTypes,
            limit,
            currentConversationId,
          },
        );
      } catch (error: any) {
        // Handle invalid projectId (e.g., conversationId passed by mistake)
        if (error.message?.includes("does not match the table name")) {
          return {
            success: false,
            error:
              "Invalid projectId - the ID provided is not a valid project ID",
            results: { files: [], notes: [], tasks: [], conversations: [] },
          };
        }
        throw error;
      }
    },
  });
}

/**
 * Search Tool: Query History
 *
 * Semantic search across conversation messages.
 * Works with or without projectId filter.
 */

import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";

export function createQueryHistoryTool(
  ctx: ActionCtx,
  userId: Id<"users">,
  currentConversationId?: Id<"conversations">,
) {
  return tool({
    description: `Search past conversations using semantic search.

✅ USE FOR:
- Finding previous discussions and decisions
- Retrieving historical context
- Looking up past conversation topics
- Finding when something was discussed

📎 RESULTS INCLUDE:
- id (message), conversationId: For reference
- url: Deep link to specific message in conversation (use in markdown links)
- conversationTitle, role, content, timestamp, score

When citing results, include the URL so users can navigate to that message.
Example: From [Conversation Title](url): "content..."

Parameters:
- query: What to search for in past conversations (required)
- projectId: Optional - filter to specific project, omit to search all conversations
- limit: Number of results (1-10, default: 5)
- includeCurrentConversation: Whether to include current conversation (default: false)`,
    inputSchema: z.object({
      query: z
        .string()
        .describe("What to search for in past conversations (semantic search)"),
      projectId: z
        .string()
        .optional()
        .describe("Optional project ID to filter results to a specific project"),
      limit: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(5)
        .describe("Number of results to return (1-10, default: 5)"),
      includeCurrentConversation: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Whether to include messages from current conversation (default: false)",
        ),
    }),
    execute: async ({
      query,
      projectId,
      limit = 5,
      includeCurrentConversation = false,
    }) => {
      try {
        return await (ctx.runAction as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.tools.search.queryHistory.queryHistory,
          {
            userId,
            query,
            projectId: projectId as Id<"projects"> | undefined,
            limit,
            includeCurrentConversation,
            currentConversationId,
          },
        );
      } catch (error: any) {
        // Handle invalid projectId (e.g., conversationId passed by mistake)
        if (error.message?.includes("does not match the table name")) {
          return {
            success: false,
            error: "Invalid projectId - the ID provided is not a valid project ID",
            results: [],
          };
        }
        throw error;
      }
    },
  });
}

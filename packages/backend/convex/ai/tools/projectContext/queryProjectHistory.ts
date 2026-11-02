/**
 * Project Context Tool: Query Project History
 *
 * Semantic search across past conversations in current project.
 * Uses vector search on message embeddings.
 */

import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";

export function createQueryProjectHistoryTool(
  ctx: ActionCtx,
  conversationId: Id<"conversations">,
) {
  return tool({
    description: `Search past conversations in the current project using semantic search.

✅ USE FOR:
- Finding previous discussions and decisions
- Retrieving historical context
- Looking up past conversation topics
- Finding when something was discussed

❌ DO NOT USE FOR:
- Current conversation messages (they're already in context)
- Searching notes (use searchProjectNotes)
- Searching files (use searchProjectFiles)
- Searching tasks (use searchProjectTasks)`,
    inputSchema: z.object({
      query: z
        .string()
        .describe("What to search for in past conversations (semantic search)"),
      limit: z
        .number()
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
      limit = 5,
      includeCurrentConversation = false,
    }) => {
      return await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.tools.projectContext.searchHistory,
        { conversationId, query, limit, includeCurrentConversation },
      );
    },
  });
}

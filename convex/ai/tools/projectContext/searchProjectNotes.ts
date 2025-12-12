/**
 * Project Context Tool: Search Project Notes
 *
 * Keyword search across notes linked to current project.
 * MVP: Simple text matching, future: vector search.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import { internal } from "../../../_generated/api";

export function createSearchProjectNotesTool(
  ctx: ActionCtx,
  conversationId: Id<"conversations">,
) {
  return tool({
    description: `Search notes linked to the current project.

✅ USE FOR:
- Finding user's written notes, ideas, and documentation
- Retrieving project-specific notes by keyword
- Getting context from manually created notes

❌ DO NOT USE FOR:
- File contents (use searchProjectFiles)
- Tasks (use searchProjectTasks)
- Conversation history (use queryProjectHistory)`,
    inputSchema: z.object({
      query: z
        .string()
        .describe("Keywords to search in note titles and content"),
      limit: z
        .number()
        .optional()
        .default(5)
        .describe("Number of results to return (1-10, default: 5)"),
    }),
    execute: async ({ query, limit = 5 }) => {
      return await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.tools.projectContext.searchNotes,
        { conversationId, query, limit },
      );
    },
  });
}

/**
 * Project Context Tool: Search Project Files
 *
 * Semantic search across files uploaded to current project.
 * Wraps existing file RAG system with tool interface.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import { internal } from "../../../_generated/api";

export function createSearchProjectFilesTool(
  ctx: ActionCtx,
  conversationId: Id<"conversations">,
) {
  return tool({
    description: `Search files in the current project using semantic search.

✅ USE FOR:
- Finding specific information in uploaded documents
- Retrieving relevant file chunks based on query
- Getting context from PDFs, text files, or other project documents

❌ DO NOT USE FOR:
- General questions not about project files
- Searching notes (use searchProjectNotes)
- Searching tasks (use searchProjectTasks)
- Searching conversation history (use queryProjectHistory)`,
    inputSchema: z.object({
      query: z
        .string()
        .describe("What to search for in project files (semantic search)"),
      topK: z
        .number()
        .optional()
        .default(5)
        .describe("Number of results to return (1-10, default: 5)"),
    }),
    execute: async ({ query, topK = 5 }) => {
      return await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.tools.projectContext.searchFiles,
        { conversationId, query, topK },
      );
    },
  });
}

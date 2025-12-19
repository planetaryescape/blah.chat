/**
 * Search Tool: Search Notes
 *
 * Hybrid search (vector + keyword) across notes.
 * Works with or without projectId filter.
 */

import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";

export function createSearchNotesTool(ctx: ActionCtx, userId: Id<"users">) {
  return tool({
    description: `Search notes using hybrid search (semantic + keyword).

✅ USE FOR:
- Finding specific notes by content or topic
- Retrieving relevant notes for context
- Getting information from user's note collection

📎 RESULTS INCLUDE:
- id, projectId: For reference
- url: Direct link to view the note (use in markdown links)
- title, preview, tags, score

When citing results, include the URL so users can click to view the full note.
Example: [Note Title](url)

Parameters:
- query: What to search for (required)
- projectId: Optional - filter to specific project, omit to search all notes
- limit: Number of results (1-20, default: 5)`,
    inputSchema: z.object({
      query: z.string().describe("What to search for in notes"),
      projectId: z
        .string()
        .optional()
        .describe("Optional project ID to filter results to a specific project"),
      limit: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(5)
        .describe("Number of results to return (1-20, default: 5)"),
    }),
    execute: async ({ query, projectId, limit = 5 }) => {
      try {
        return await (ctx.runAction as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.tools.search.searchNotes.searchNotes,
          {
            userId,
            query,
            projectId: projectId as Id<"projects"> | undefined,
            limit,
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

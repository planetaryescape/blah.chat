/**
 * Search Tool: Search Files
 *
 * Semantic search across uploaded files.
 * Works with or without projectId filter.
 */

import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";

export function createSearchFilesTool(ctx: ActionCtx, userId: Id<"users">) {
  return tool({
    description: `Search files using semantic search.

✅ USE FOR:
- Finding specific information in uploaded documents
- Retrieving relevant file chunks based on query
- Getting context from PDFs, text files, or other documents

📎 RESULTS INCLUDE:
- id (chunk), fileId, projectId: For reference
- url: Link to project files page (if in project)
- filename, content, page, score

When citing results, include the URL so users can navigate to files.
Example: From [filename](url) (page N): "content..."

Parameters:
- query: What to search for (required)
- projectId: Optional - filter to specific project, omit to search all files
- limit: Number of results (1-20, default: 5)`,
    inputSchema: z.object({
      query: z
        .string()
        .describe("What to search for in files (semantic search)"),
      projectId: z
        .string()
        .optional()
        .describe(
          "Optional project ID to filter results to a specific project",
        ),
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
          internal.tools.search.searchFiles.searchFiles,
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

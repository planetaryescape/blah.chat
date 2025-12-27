/**
 * Backend Action: Search Files
 *
 * Vector search on file chunks with optional projectId filter.
 * Works with or without projectId:
 * - With projectId: Search only that project's files
 * - Without projectId: Search ALL user's files
 */

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import type { FileChunkResult } from "../../files/search";

export const searchFiles = internalAction({
  args: {
    userId: v.id("users"),
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Call existing file search with optional projectId filter
    const chunks = (await (ctx.runAction as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.files.search.searchFileChunks,
      {
        query: args.query,
        projectId: args.projectId, // undefined = search all user's files
        topK: args.limit,
        userId: args.userId,
      },
    )) as FileChunkResult[];

    if (chunks.length === 0) {
      return {
        success: true,
        results: [],
        message: args.projectId
          ? "No matching files found in project"
          : "No matching files found",
      };
    }

    // Format results with IDs for URL construction
    const results = chunks.map((c) => ({
      id: c.chunk._id,
      fileId: c.chunk.fileId,
      projectId: c.chunk.projectId || null,
      filename: c.file?.name || "unknown",
      content:
        c.chunk.content.slice(0, 500) +
        (c.chunk.content.length > 500 ? "..." : ""),
      score: c.score.toFixed(3),
      page: c.chunk.startPage,
      url: c.chunk.projectId
        ? `/projects/${c.chunk.projectId}/files?file=${c.chunk.fileId}&chunk=${c.chunk._id}`
        : null, // Files require project context for viewing
    }));

    return {
      success: true,
      results,
      totalResults: chunks.length,
    };
  },
});

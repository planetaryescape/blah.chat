/**
 * Backend Action: Search Project Files
 *
 * Wraps existing file search with conversation → project lookup.
 * Leverages Phase 4 file RAG system (chunking, embeddings, vector search).
 */

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";
import type { FileChunkResult } from "../../files/search";

export const searchFiles = internalAction({
  args: {
    conversationId: v.id("conversations"),
    query: v.string(),
    topK: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Get project via conversation
    const conversation = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getConversation,
      { id: args.conversationId },
    )) as Doc<"conversations"> | null;

    if (!conversation?.projectId) {
      return {
        success: true,
        results: [],
        message: "No project associated with this conversation",
      };
    }

    // 2. Call existing file search with projectId filter
    const chunks = (await (ctx.runAction as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.files.search.searchFileChunks,
      {
        query: args.query,
        projectId: conversation.projectId,
        topK: args.topK,
        userId: conversation.userId,
      },
    )) as FileChunkResult[];

    if (chunks.length === 0) {
      return {
        success: true,
        results: [],
        message: "No matching files found in project",
      };
    }

    // 3. Format results (truncate to 500 chars for token efficiency)
    const results = chunks.map((c) => ({
      filename: c.file?.name || "unknown",
      content:
        c.chunk.content.slice(0, 500) +
        (c.chunk.content.length > 500 ? "..." : ""),
      score: c.score.toFixed(3),
    }));

    return {
      success: true,
      results,
      totalResults: chunks.length,
    };
  },
});

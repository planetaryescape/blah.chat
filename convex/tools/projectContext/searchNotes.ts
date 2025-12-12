/**
 * Backend Action: Search Project Notes
 *
 * Searches notes linked to project via projectNotes junction.
 * MVP: Simple keyword matching (case-insensitive).
 * Future: Vector search for semantic matching.
 */

import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";

export const searchNotes = internalAction({
  args: {
    conversationId: v.id("conversations"),
    query: v.string(),
    limit: v.number(),
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

    // 2. Get note IDs via junction
    const junctions = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.tools.projectContext.helpers.getNoteIds,
      { projectId: conversation.projectId },
    )) as Array<{ noteId: any }>;

    if (junctions.length === 0) {
      return {
        success: true,
        results: [],
        message: "No notes linked to this project",
      };
    }

    // 3. Full-text search on content (MVP - no vector search yet)
    const notes = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.tools.projectContext.helpers.searchNoteContent,
      {
        noteIds: junctions.map((j) => j.noteId),
        query: args.query,
        limit: args.limit,
      },
    )) as Doc<"notes">[];

    if (notes.length === 0) {
      return {
        success: true,
        results: [],
        message: "No matching notes found",
      };
    }

    // 4. Format results (truncate to 300 chars for token efficiency)
    const results = notes.map((n) => ({
      title: n.title,
      preview:
        n.content.slice(0, 300) + (n.content.length > 300 ? "..." : ""),
      tags: n.tags || [],
      updatedAt: new Date(n._creationTime).toISOString(),
    }));

    return {
      success: true,
      results,
      totalResults: notes.length,
    };
  },
});

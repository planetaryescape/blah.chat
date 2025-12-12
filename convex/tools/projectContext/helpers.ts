/**
 * Shared Helper Queries/Actions for Project Context Tools
 *
 * Centralized queries to avoid duplication across tools.
 * Follows pattern from convex/lib/helpers.ts.
 */

import { internalQuery, internalAction } from "../../_generated/server";
import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { embed } from "ai";
import { EMBEDDING_MODEL } from "../../../src/lib/ai/operational-models";
import { internal } from "../../_generated/api";

/**
 * Get note IDs for a project (via junction table)
 */
export const getNoteIds = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projectNotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

/**
 * Search note content by keyword (case-insensitive)
 */
export const searchNoteContent = internalQuery({
  args: {
    noteIds: v.array(v.id("notes")),
    query: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all notes
    const notes = await Promise.all(args.noteIds.map((id) => ctx.db.get(id)));
    const validNotes = notes.filter(
      (n): n is Doc<"notes"> => n !== null,
    );

    // Simple keyword filter (case-insensitive)
    const queryLower = args.query.toLowerCase();
    const matches = validNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(queryLower) ||
        n.content.toLowerCase().includes(queryLower),
    );

    return matches.slice(0, args.limit);
  },
});

/**
 * Filter tasks by project and optional status
 */
export const filterTasks = internalQuery({
  args: {
    projectId: v.id("projects"),
    status: v.optional(
      v.union(
        v.literal("suggested"),
        v.literal("confirmed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    return await query.order("desc").take(args.limit);
  },
});

/**
 * Get conversation IDs for a project (via junction table)
 */
export const getConversationIds = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projectConversations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

/**
 * Vector search on message embeddings with conversationId filtering
 */
export const vectorSearchMessages = internalAction({
  args: {
    conversationIds: v.array(v.id("conversations")),
    query: v.string(),
    limit: v.number(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Generate query embedding
    const { embedding: queryEmbedding } = await embed({
      model: EMBEDDING_MODEL,
      value: args.query,
    });

    // Vector search (filter by userId)
    const results = await ctx.vectorSearch("messages", "by_embedding", {
      vector: queryEmbedding,
      limit: args.limit * 2, // Over-fetch for filtering
      filter: (q) => q.eq("userId", args.userId),
    });

    // Fetch message docs + filter by conversationId
    const messages: Array<
      Doc<"messages"> & { score: number; conversationTitle: string }
    > = [];
    for (const result of results) {
      const message = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.lib.helpers.getMessage,
        { id: result._id },
      )) as Doc<"messages"> | null;

      if (
        message &&
        message.embedding &&
        args.conversationIds.includes(message.conversationId as any)
      ) {
        const score = cosineSimilarity(queryEmbedding, message.embedding);

        // Get conversation title
        const conv = (await (ctx.runQuery as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.lib.helpers.getConversation,
          { id: message.conversationId },
        )) as Doc<"conversations"> | null;

        messages.push({
          ...message,
          score,
          conversationTitle: conv?.title || "Untitled",
        });
      }
    }

    return messages
      .sort((a, b) => b.score - a.score)
      .slice(0, args.limit);
  },
});

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

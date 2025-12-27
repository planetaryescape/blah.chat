/**
 * Backend Action: Search Notes
 *
 * Hybrid search (vector + keyword) on notes with optional projectId filter.
 * Works with or without projectId:
 * - With projectId: Search only that project's notes
 * - Without projectId: Search ALL user's notes
 */

import { embed } from "ai";
import { v } from "convex/values";
import { EMBEDDING_MODEL } from "@/lib/ai/operational-models";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";

export const searchNotes = internalAction({
  args: {
    userId: v.id("users"),
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Generate query embedding for vector search
    const { embedding: queryEmbedding } = await embed({
      model: EMBEDDING_MODEL,
      value: args.query,
    });

    // Vector search with optional projectId filter
    const vectorResults = await ctx.vectorSearch("notes", "by_embedding", {
      vector: queryEmbedding,
      limit: args.limit * 2, // Over-fetch for reranking
      filter: args.projectId
        ? (q: any) =>
            q.eq("userId", args.userId).eq("projectId", args.projectId)
        : (q: any) => q.eq("userId", args.userId),
    });

    if (vectorResults.length === 0) {
      return {
        success: true,
        results: [],
        message: args.projectId
          ? "No matching notes found in project"
          : "No matching notes found",
      };
    }

    // Fetch full note documents and calculate scores
    const notes: Array<Doc<"notes"> & { score: number }> = [];
    for (const result of vectorResults) {
      const note = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.lib.helpers.getNote,
        { noteId: result._id },
      )) as Doc<"notes"> | null;

      if (note?.embedding) {
        const score = cosineSimilarity(queryEmbedding, note.embedding);
        notes.push({ ...note, score });
      }
    }

    // Sort by score and take top results
    const sortedNotes = notes
      .sort((a, b) => b.score - a.score)
      .slice(0, args.limit);

    if (sortedNotes.length === 0) {
      return {
        success: true,
        results: [],
        message: "No matching notes found",
      };
    }

    // Format results with IDs for URL construction
    const results = sortedNotes.map((n) => ({
      id: n._id,
      projectId: n.projectId || null,
      title: n.title,
      preview: n.content.slice(0, 300) + (n.content.length > 300 ? "..." : ""),
      tags: n.tags || [],
      score: n.score.toFixed(3),
      updatedAt: new Date(n._creationTime).toISOString(),
      url: n.projectId
        ? `/projects/${n.projectId}/notes?note=${n._id}`
        : `/notes?note=${n._id}`,
    }));

    return {
      success: true,
      results,
      totalResults: sortedNotes.length,
    };
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

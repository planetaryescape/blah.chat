/**
 * Semantic File Search for RAG
 * Smart Manager Phase 4: File RAG System
 *
 * Vector search across file chunks within project context.
 * Pattern: Follow convex/search/semantic.ts for vector search patterns.
 */

import { embed } from "ai";
import { v } from "convex/values";
import { EMBEDDING_MODEL } from "@/lib/ai/operational-models";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action } from "../_generated/server";

export interface FileChunkResult {
  chunk: Doc<"fileChunks">;
  file: Doc<"files"> | null;
  score: number;
}

/**
 * Search file chunks using semantic (vector) search
 * Optionally filter by projectId to search only project files
 */
export const searchFileChunks = action({
  args: {
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    topK: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<FileChunkResult[]> => {
    const startTime = Date.now();
    const topK = args.topK ?? 10;

    // 1. Generate query embedding
    const { embedding: queryEmbedding } = await embed({
      model: EMBEDDING_MODEL,
      value: args.query,
    });

    // 2. Get file IDs to filter by (if projectId provided)
    let fileIds: string[] | undefined;
    if (args.projectId) {
      const fileJunctions = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.files.search.getProjectFileIds,
        { projectId: args.projectId },
      )) as Array<{ fileId: any }>;

      fileIds = fileJunctions.map((j) => j.fileId);

      if (fileIds.length === 0) {
        console.log("[FileSearch] No files in project");
        return [];
      }
    }

    // 3. Perform vector search
    const searchResults = (await (ctx.runAction as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.files.search.vectorSearchChunks,
      {
        queryEmbedding,
        userId: args.userId,
        fileIds,
        topK,
      },
    )) as Array<{ chunk: Doc<"fileChunks">; score: number }>;

    // 4. Hydrate with file details
    const fileMap = new Map<any, Doc<"files"> | null>();
    const uniqueFileIds = [
      ...new Set(searchResults.map((r) => r.chunk.fileId)),
    ];

    await Promise.all(
      uniqueFileIds.map(async (fileId) => {
        const file = (await (ctx.runQuery as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.lib.helpers.getFile,
          { fileId },
        )) as Doc<"files"> | null;
        fileMap.set(fileId, file);
      }),
    );

    const results: FileChunkResult[] = searchResults.map((r) => ({
      chunk: r.chunk,
      file: fileMap.get(r.chunk.fileId) || null,
      score: r.score,
    }));

    const duration = Date.now() - startTime;
    console.log(
      `[FileSearch] ✓ Query: "${args.query.slice(0, 50)}..." → ${results.length} chunks (${duration}ms)`,
    );
    if (results.length > 0) {
      console.log(
        `  Top score: ${results[0].score.toFixed(3)} | ${results[0].file?.name || "unknown"}`,
      );
    }

    return results;
  },
});

import { internalQuery } from "../_generated/server";

/**
 * Internal query to get file IDs for a project
 */
export const getProjectFileIds = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

import { internalAction } from "../_generated/server";

/**
 * Internal action for vector search on file chunks
 */
export const vectorSearchChunks = internalAction({
  args: {
    queryEmbedding: v.array(v.float64()),
    userId: v.id("users"),
    fileIds: v.optional(v.array(v.string())),
    topK: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      // Perform native Convex vector search
      const results = await ctx.vectorSearch("fileChunks", "by_embedding", {
        vector: args.queryEmbedding,
        limit: args.topK * 2, // Over-fetch for fileId filtering
        filter: (q) => q.eq("userId", args.userId),
      });

      // Fetch full chunk documents
      const chunks: Doc<"fileChunks">[] = [];
      for (const result of results) {
        const chunk = await ctx.runQuery(internal.lib.helpers.getFileChunk, {
          chunkId: result._id,
        });
        if (chunk) chunks.push(chunk);
      }

      // Filter by fileIds if provided
      let filteredChunks = chunks;
      if (args.fileIds && args.fileIds.length > 0) {
        filteredChunks = chunks.filter((chunk) =>
          args.fileIds?.includes(chunk.fileId as any),
        );
      }

      // Calculate scores and limit to topK
      const scored = filteredChunks
        .map((chunk) => {
          const score = cosineSimilarity(args.queryEmbedding, chunk.embedding);
          return { chunk, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, args.topK);

      return scored;
    } catch (error) {
      console.error("[FileVectorSearch] Error:", error);
      return [];
    }
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

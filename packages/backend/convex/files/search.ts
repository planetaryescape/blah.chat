/**
 * Semantic File Search for RAG
 * Smart Manager Phase 4: File RAG System
 *
 * Vector search across file chunks within project context.
 * Pattern: Follow convex/search/semantic.ts for vector search patterns.
 */

import { EMBEDDING_MODEL } from "@blah-chat/ai/operational-models";
import { embed } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction, internalQuery } from "../_generated/server";
import { logger } from "../lib/logger";

export interface FileChunkResult {
  chunk: Doc<"fileChunks">;
  file: Doc<"files"> | null;
  score: number;
}

/**
 * Search file chunks using semantic (vector) search
 * Optionally filter by projectId to search only project files
 */
export const searchFileChunks = internalAction({
  args: {
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    topK: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<FileChunkResult[]> => {
    const startTime = Date.now();
    const topK = args.topK ?? 10;

    if (args.query.trim().length === 0 || args.query.length > 2000) {
      throw new Error("Query must contain 1 to 2000 characters");
    }
    if (!Number.isInteger(topK) || topK < 1 || topK > 128) {
      throw new Error("topK must be an integer between 1 and 128");
    }

    // Project ownership is checked before embedding so rejected searches do no
    // provider work. Generation calls this internal action with its trusted user.
    let fileIds: string[] | undefined;
    if (args.projectId) {
      // SAFETY: Convex validates args; the internal query checks project ownership
      // before returning schema-validated project-file rows.
      const fileJunctions = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.files.search.getProjectFileIds,
        { projectId: args.projectId, userId: args.userId },
      )) as Array<{ fileId: string }>;

      fileIds = fileJunctions.map((junction) => junction.fileId);
      if (fileIds.length === 0) return [];
    }

    // 1. Generate query embedding
    const { embedding: queryEmbedding } = await embed({
      model: EMBEDDING_MODEL,
      value: args.query,
    });

    // 2. Perform vector search
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

    // 3. Hydrate with file details
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

    // Re-read after provider, vector, and hydration awaits so a concurrent
    // project ownership or membership change cannot leave this result stale.
    if (args.projectId) {
      // SAFETY: Same validated internal query and schema-validated row shape as above.
      const currentFiles = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.files.search.getProjectFileIds,
        { projectId: args.projectId, userId: args.userId },
      )) as Array<{ fileId: string }>;
      fileIds = currentFiles.map((junction) => junction.fileId);
    }

    const authorizedFileIds = fileIds ? new Set(fileIds) : undefined;
    const results: FileChunkResult[] = searchResults.flatMap((result) => {
      const file = fileMap.get(result.chunk.fileId);
      if (
        result.chunk.userId !== args.userId ||
        file?.userId !== args.userId ||
        (authorizedFileIds && !authorizedFileIds.has(result.chunk.fileId))
      ) {
        return [];
      }
      return [{ chunk: result.chunk, file, score: result.score }];
    });

    const duration = Date.now() - startTime;
    logger.info("File search complete", {
      tag: "FileSearch",
      query: args.query.slice(0, 50),
      resultCount: results.length,
      durationMs: duration,
      topScore: results.length > 0 ? results[0].score : undefined,
      topFile: results.length > 0 ? results[0].file?.name : undefined,
    });

    return results;
  },
});

/**
 * Internal query to get file IDs for a project
 */
export const getProjectFileIds = internalQuery({
  args: { projectId: v.id("projects"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== args.userId) {
      throw new Error("Unauthorized project file search");
    }

    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    return files.filter((file) => file.userId === args.userId);
  },
});

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
        if (chunk?.userId === args.userId) chunks.push(chunk);
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
      logger.error("Vector search error", {
        tag: "FileVectorSearch",
        error: String(error),
      });
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

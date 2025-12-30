/**
 * File Embedding Generation for RAG
 * Smart Manager Phase 4: File RAG System
 *
 * Generates embeddings for file chunks and stores them in vector index.
 * Pattern: Follow convex/messages/embeddings.ts batch processing pattern.
 */

import { embed } from "ai";
import { v } from "convex/values";
import {
  calculateEmbeddingCost,
  EMBEDDING_MODEL,
  EMBEDDING_PRICING,
} from "@/lib/ai/operational-models";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { estimateTokens } from "../tokens/counting";

// Batch size for embedding generation (API rate limits)
const EMBEDDING_BATCH_SIZE = 100;

/**
 * Generate embeddings for all chunks of a file
 * Updates file status throughout the process
 */
export const generateFileEmbeddings = internalAction({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      // 0. Get file to retrieve userId for cost tracking
      const file = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.files.embeddings.getFileInternal,
        { fileId: args.fileId },
      )) as { userId: Id<"users"> } | null;

      if (!file) {
        throw new Error("File not found");
      }

      // 1. Update file status to "processing"
      (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.files.embeddings.updateEmbeddingStatus,
        {
          fileId: args.fileId,
          status: "processing",
        },
      )) as Promise<void>;

      // 2. Extract text from file using LLM-based extraction
      const text = (await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.files.extraction.extractText,
        { fileId: args.fileId },
      )) as string;

      // 3. Chunk the text
      const chunks = (await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.files.chunking.chunkFile,
        { fileId: args.fileId, content: text },
      )) as Array<{
        content: string;
        chunkIndex: number;
        metadata: {
          charOffset: number;
          tokenCount: number;
          startPage?: number;
          endPage?: number;
        };
      }>;

      console.log(
        `[FileEmbedding] Processing ${chunks.length} chunks in batches of ${EMBEDDING_BATCH_SIZE}`,
      );

      // 4. Generate embeddings in batches
      let _processedCount = 0;
      for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
        const batchChunks = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
        const batchStart = Date.now();

        // Generate embeddings for batch
        const embeddings = await Promise.all(
          batchChunks.map(async (chunk) => {
            const { embedding } = await embed({
              model: EMBEDDING_MODEL,
              value: chunk.content,
            });
            return embedding;
          }),
        );

        // Track embedding cost for this batch
        const batchTokens = batchChunks.reduce(
          (sum, chunk) => sum + estimateTokens(chunk.content),
          0,
        );
        await ctx.scheduler.runAfter(
          0,
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.usage.mutations.recordEmbedding,
          {
            userId: file.userId,
            model: EMBEDDING_PRICING.model,
            tokenCount: batchTokens,
            cost: calculateEmbeddingCost(batchTokens),
            feature: "files",
          },
        );

        // Insert chunks with embeddings
        (await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.files.embeddings.insertFileChunks,
          {
            fileId: args.fileId,
            chunks: batchChunks.map((chunk, idx) => ({
              ...chunk,
              embedding: embeddings[idx],
            })),
          },
        )) as Promise<void>;

        _processedCount += batchChunks.length;
        const batchDuration = Date.now() - batchStart;
        console.log(
          `[FileEmbedding] Batch ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1}: ${batchChunks.length} chunks (${batchDuration}ms)`,
        );
      }

      // 5. Update file status to "completed"
      (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.files.embeddings.updateEmbeddingStatus,
        {
          fileId: args.fileId,
          status: "completed",
          chunkCount: chunks.length,
          processedAt: Date.now(),
        },
      )) as Promise<void>;

      const totalDuration = Date.now() - startTime;
      console.log(
        `[FileEmbedding] ✓ Complete: ${chunks.length} chunks embedded (${totalDuration}ms)`,
      );
      console.log(
        `  Avg: ${Math.round(totalDuration / chunks.length)}ms/chunk`,
      );

      return {
        success: true,
        chunkCount: chunks.length,
        duration: totalDuration,
      };
    } catch (error: any) {
      console.error("[FileEmbedding] Error:", error);

      // Update file status to "failed"
      (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.files.embeddings.updateEmbeddingStatus,
        {
          fileId: args.fileId,
          status: "failed",
          error: error.message,
        },
      )) as Promise<void>;

      throw error;
    }
  },
});

/**
 * Internal mutation to update file embedding status
 */
export const updateEmbeddingStatus = internalMutation({
  args: {
    fileId: v.id("files"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    chunkCount: v.optional(v.number()),
    processedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      embeddingStatus: args.status,
    };

    if (args.chunkCount !== undefined) {
      updates.chunkCount = args.chunkCount;
    }
    if (args.processedAt !== undefined) {
      updates.processedAt = args.processedAt;
    }
    if (args.error !== undefined) {
      updates.embeddingError = args.error;
    }

    await ctx.db.patch(args.fileId, updates);
  },
});

/**
 * Internal mutation to bulk insert file chunks with embeddings
 */
export const insertFileChunks = internalMutation({
  args: {
    fileId: v.id("files"),
    chunks: v.array(
      v.object({
        content: v.string(),
        chunkIndex: v.number(),
        embedding: v.array(v.float64()),
        metadata: v.object({
          charOffset: v.number(),
          tokenCount: v.number(),
          startPage: v.optional(v.number()),
          endPage: v.optional(v.number()),
        }),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Look up projectId from projectFiles junction table
    const projectFile = await ctx.db
      .query("projectFiles")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .first();

    const projectId = projectFile?.projectId;

    // Insert all chunks
    const now = Date.now();
    for (const chunk of args.chunks) {
      await ctx.db.insert("fileChunks", {
        fileId: args.fileId,
        userId: file.userId,
        projectId, // Include projectId for project-scoped search
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: chunk.embedding,
        charOffset: chunk.metadata.charOffset,
        tokenCount: chunk.metadata.tokenCount,
        startPage: chunk.metadata.startPage,
        endPage: chunk.metadata.endPage,
        createdAt: now,
      });
    }
  },
});

/**
 * Internal query to get file for cost tracking
 */
export const getFileInternal = internalQuery({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.fileId);
  },
});

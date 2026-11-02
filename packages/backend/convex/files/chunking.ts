/**
 * File Chunking Logic for RAG
 * Smart Manager Phase 4: File RAG System
 *
 * Splits documents into overlapping chunks for embedding generation.
 * Target: 500 tokens (~2k chars), 75 token overlap (15%) for context continuity.
 *
 * Research shows 400-512 tokens optimal for retrieval quality.
 * Larger chunks (1500+) return unfocused context; smaller lose meaning.
 * See: https://www.pinecone.io/learn/chunking-strategies/
 *
 * Pattern: Follow convex/messages/embeddings.ts for batch processing
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { logger } from "../lib/logger";

// Chunk configuration (optimized based on RAG research)
export const CHARS_PER_TOKEN = 4; // Approximate (actual varies by model)
export const TARGET_TOKENS = 500; // Optimal for retrieval (was 1500)
export const OVERLAP_TOKENS = 75; // 15% overlap for context (was 300)
export const CHUNK_SIZE_CHARS = TARGET_TOKENS * CHARS_PER_TOKEN; // ~2000 chars
export const OVERLAP_SIZE_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN; // ~300 chars

export interface FileChunk {
  content: string;
  chunkIndex: number;
  metadata: {
    charOffset: number;
    tokenCount: number;
    startPage?: number;
    endPage?: number;
  };
}

/**
 * Split text content into overlapping chunks
 * Uses simple character-based splitting (future: tiktoken for precise token counts)
 */
export function chunkText(text: string): FileChunk[] {
  const chunks: FileChunk[] = [];
  let charOffset = 0;
  let chunkIndex = 0;

  // Handle empty or very small files
  if (text.length === 0) {
    return [];
  }

  if (text.length <= CHUNK_SIZE_CHARS) {
    // Single chunk for small files
    return [
      {
        content: text,
        chunkIndex: 0,
        metadata: {
          charOffset: 0,
          tokenCount: Math.ceil(text.length / CHARS_PER_TOKEN),
        },
      },
    ];
  }

  // Split into overlapping chunks
  while (charOffset < text.length) {
    const endOffset = Math.min(charOffset + CHUNK_SIZE_CHARS, text.length);
    const chunkText = text.slice(charOffset, endOffset);

    chunks.push({
      content: chunkText,
      chunkIndex,
      metadata: {
        charOffset,
        tokenCount: Math.ceil(chunkText.length / CHARS_PER_TOKEN),
      },
    });

    // Move forward by (chunk_size - overlap) for next chunk
    // This creates overlap between consecutive chunks
    charOffset += CHUNK_SIZE_CHARS - OVERLAP_SIZE_CHARS;
    chunkIndex++;
  }

  return chunks;
}

/**
 * Chunk file action - processes file content into chunks
 * Called by embedding generation pipeline
 */
export const chunkFile = action({
  args: {
    fileId: v.id("files"),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<FileChunk[]> => {
    const startTime = Date.now();

    // Get file for metadata
    const file = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getFile,
      { fileId: args.fileId },
    )) as Doc<"files"> | null;

    if (!file) {
      throw new Error("File not found");
    }

    // Chunk the content
    const chunks = chunkText(args.content);

    const duration = Date.now() - startTime;
    logger.info("File chunked", {
      tag: "FileChunking",
      fileName: file.name,
      chunkCount: chunks.length,
      durationMs: duration,
      avgChunkSize: Math.round(args.content.length / chunks.length),
    });

    return chunks;
  },
});

/**
 * Extract text from file storage
 * Handles different file types (txt, md, pdf, docx)
 * For MVP: Only text files, add PDF/DOCX extraction later
 */
export const extractFileText = action({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args): Promise<string> => {
    // Get file from storage
    const file = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getFile,
      { fileId: args.fileId },
    )) as Doc<"files"> | null;

    if (!file) {
      throw new Error("File not found");
    }

    // Read file content from storage
    const blob = await ctx.storage.get(file.storageId);
    if (!blob) {
      throw new Error("File content not found in storage");
    }

    // Convert to text
    const text = await blob.text();

    // Basic validation
    if (!text || text.trim().length === 0) {
      throw new Error("File is empty or contains no text");
    }

    logger.info("File text extracted", {
      tag: "FileExtraction",
      fileName: file.name,
      charCount: text.length,
    });

    return text;
  },
});

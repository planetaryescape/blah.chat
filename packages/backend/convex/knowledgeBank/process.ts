/**
 * Knowledge Bank Processing
 *
 * Handles extraction, chunking, and embedding generation for knowledge sources.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import {
  CHARS_PER_TOKEN,
  CHUNK_SIZE_CHARS,
  chunkText,
  OVERLAP_SIZE_CHARS,
} from "../files/chunking";
import { EMBEDDING_BATCH_SIZE, EMBEDDING_MODEL } from "./constants";
import { KNOWLEDGE_BANK_LIMITS } from "./index";

interface ProcessedChunk {
  content: string;
  chunkIndex: number;
  charOffset: number;
  tokenCount: number;
  startTime?: string;
  endTime?: string;
  pageNumber?: number;
}

/**
 * Main processing action - dispatches to appropriate extractor based on source type
 */
export const processSource = internalAction({
  args: {
    sourceId: v.id("knowledgeSources"),
  },
  handler: async (ctx, args) => {
    console.log(`[KnowledgeBank] Processing source ${args.sourceId}`);

    // Get source
    const source = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.knowledgeBank.index.getSource,
      { sourceId: args.sourceId },
    )) as Doc<"knowledgeSources"> | null;

    if (!source) {
      console.error(`[KnowledgeBank] Source not found: ${args.sourceId}`);
      return;
    }

    // Update status to processing
    await (ctx.runMutation as any)(
      // @ts-ignore
      internal.knowledgeBank.index.updateStatus,
      { sourceId: args.sourceId, status: "processing" },
    );

    try {
      let text: string;
      let chunks: ProcessedChunk[];

      // Extract content based on type
      switch (source.type) {
        case "text":
          text = source.rawContent || "";
          chunks = chunkText(text).map((c) => ({
            content: c.content,
            chunkIndex: c.chunkIndex,
            charOffset: c.metadata.charOffset,
            tokenCount: c.metadata.tokenCount,
          }));
          break;

        case "file":
          // Use existing file extraction
          text = await extractFileContent(ctx, source);
          chunks = chunkText(text).map((c) => ({
            content: c.content,
            chunkIndex: c.chunkIndex,
            charOffset: c.metadata.charOffset,
            tokenCount: c.metadata.tokenCount,
          }));
          break;

        case "web": {
          // Extract web content
          const webResult = await extractWebContent(ctx, source.url!);
          text = webResult.content;
          chunks = chunkText(text).map((c) => ({
            content: c.content,
            chunkIndex: c.chunkIndex,
            charOffset: c.metadata.charOffset,
            tokenCount: c.metadata.tokenCount,
          }));
          // Update title if extracted
          if (webResult.title && source.title === source.url) {
            await (ctx.runMutation as any)(
              // @ts-ignore
              internal.knowledgeBank.index.updateStatus,
              { sourceId: args.sourceId, status: "processing" },
            );
          }
          break;
        }

        case "youtube": {
          // Extract YouTube transcript
          const ytResult = await extractYouTubeContent(
            ctx,
            source.videoMetadata!.videoId,
          );
          text = ytResult.transcript;
          chunks = ytResult.chunks;
          break;
        }

        default:
          throw new Error(`Unknown source type: ${source.type}`);
      }

      // Check chunk limit
      if (chunks.length > KNOWLEDGE_BANK_LIMITS.maxChunksPerSource) {
        throw new Error(
          `Content too large: ${chunks.length} chunks (max ${KNOWLEDGE_BANK_LIMITS.maxChunksPerSource})`,
        );
      }

      // Generate embeddings in batches
      console.log(
        `[KnowledgeBank] Generating embeddings for ${chunks.length} chunks`,
      );

      for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
        const embeddings = await generateEmbeddings(
          batch.map((c) => c.content),
        );

        // Insert chunks with embeddings
        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          await (ctx.runMutation as any)(
            // @ts-ignore
            internal.knowledgeBank.index.insertChunk,
            {
              sourceId: args.sourceId,
              userId: source.userId,
              projectId: source.projectId,
              content: chunk.content,
              chunkIndex: chunk.chunkIndex,
              charOffset: chunk.charOffset,
              tokenCount: chunk.tokenCount,
              startTime: chunk.startTime,
              endTime: chunk.endTime,
              pageNumber: chunk.pageNumber,
              embedding: embeddings[j],
            },
          );
        }

        console.log(
          `[KnowledgeBank] Processed batch ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1}/${Math.ceil(chunks.length / EMBEDDING_BATCH_SIZE)}`,
        );
      }

      // Update status to completed
      await (ctx.runMutation as any)(
        // @ts-ignore
        internal.knowledgeBank.index.updateStatus,
        {
          sourceId: args.sourceId,
          status: "completed",
          chunkCount: chunks.length,
        },
      );

      console.log(
        `[KnowledgeBank] Completed processing ${args.sourceId}: ${chunks.length} chunks`,
      );
    } catch (error) {
      console.error(
        `[KnowledgeBank] Error processing ${args.sourceId}:`,
        error,
      );

      await (ctx.runMutation as any)(
        // @ts-ignore
        internal.knowledgeBank.index.updateStatus,
        {
          sourceId: args.sourceId,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
    }
  },
});

/**
 * Extract content from a file in storage
 */
async function extractFileContent(
  ctx: any,
  source: Doc<"knowledgeSources">,
): Promise<string> {
  if (!source.storageId) {
    throw new Error("No storage ID for file source");
  }

  const blob = await ctx.storage.get(source.storageId);
  if (!blob) {
    throw new Error("File not found in storage");
  }

  const mimeType = source.mimeType || "";

  // Direct text extraction for text files
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  ) {
    return await blob.text();
  }

  // For PDFs and other documents, use LLM extraction
  if (
    mimeType === "application/pdf" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    // Use file extraction action with storage ID
    const result = (await (ctx.runAction as any)(
      // @ts-ignore
      internal.files.extraction.extractTextFromStorage,
      {
        storageId: source.storageId,
        mimeType,
        fileName: source.title,
        userId: source.userId,
      },
    )) as string;
    return result;
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Extract content from a web URL using Firecrawl
 */
async function extractWebContent(
  ctx: any,
  url: string,
): Promise<{ content: string; title?: string }> {
  // Use Firecrawl API for web extraction
  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

  if (!firecrawlApiKey) {
    // Fallback: simple fetch + HTML to text
    console.log("[KnowledgeBank] Firecrawl not configured, using simple fetch");
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    const html = await response.text();
    // Basic HTML to text (strips tags)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { content: text };
  }

  // Firecrawl scrape endpoint
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${firecrawlApiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firecrawl error: ${error}`);
  }

  const data = (await response.json()) as {
    data?: {
      markdown?: string;
      content?: string;
      metadata?: { title?: string };
    };
  };

  return {
    content: data.data?.markdown || data.data?.content || "",
    title: data.data?.metadata?.title,
  };
}

/**
 * Extract transcript from a YouTube video
 */
async function extractYouTubeContent(
  ctx: any,
  videoId: string,
): Promise<{ transcript: string; chunks: ProcessedChunk[] }> {
  // Try to get transcript using YouTube's API or a transcript service
  // For now, we'll use a simple approach with the youtube-transcript package
  // In production, you might want to use the official YouTube API

  try {
    // Use Gemini to extract/transcribe if available
    // For MVP: Use a transcript extraction service
    const response = await fetch(
      `https://yt-transcript-api.vercel.app/api/transcript?videoId=${videoId}`,
    );

    if (!response.ok) {
      // Fallback: Use video metadata only and note that transcript unavailable
      console.log(
        `[KnowledgeBank] Transcript not available for ${videoId}, using metadata only`,
      );
      return {
        transcript: `YouTube video: ${videoId}. Transcript not available.`,
        chunks: [
          {
            content: `YouTube video: ${videoId}. Transcript not available. Consider watching the video directly.`,
            chunkIndex: 0,
            charOffset: 0,
            tokenCount: 20,
          },
        ],
      };
    }

    const data = (await response.json()) as {
      transcript?: string;
      segments?: Array<{ text?: string; start?: number }>;
    };
    const transcript = data.transcript || "";

    // Chunk transcript with timestamps
    const chunks: ProcessedChunk[] = [];
    let currentChunk = "";
    let currentStart = "0:00";
    let chunkIndex = 0;
    let charOffset = 0;

    // Process transcript segments (if available with timestamps)
    if (Array.isArray(data.segments)) {
      for (const segment of data.segments) {
        const segmentText = segment.text || "";
        const startTime = formatTime(segment.start || 0);

        if (
          currentChunk.length + segmentText.length >
          CHUNK_SIZE_CHARS - OVERLAP_SIZE_CHARS
        ) {
          // Save current chunk
          if (currentChunk.trim()) {
            chunks.push({
              content: currentChunk.trim(),
              chunkIndex,
              charOffset,
              tokenCount: Math.ceil(currentChunk.length / CHARS_PER_TOKEN),
              startTime: currentStart,
              endTime: startTime,
            });
            chunkIndex++;
            charOffset += currentChunk.length;
          }
          currentChunk = "";
          currentStart = startTime;
        }

        currentChunk += `${segmentText} `;
      }

      // Add remaining chunk
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          chunkIndex,
          charOffset,
          tokenCount: Math.ceil(currentChunk.length / CHARS_PER_TOKEN),
          startTime: currentStart,
        });
      }
    } else {
      // No timestamps, use regular chunking
      const textChunks = chunkText(transcript);
      return {
        transcript,
        chunks: textChunks.map((c) => ({
          content: c.content,
          chunkIndex: c.chunkIndex,
          charOffset: c.metadata.charOffset,
          tokenCount: c.metadata.tokenCount,
        })),
      };
    }

    return { transcript, chunks };
  } catch (error) {
    console.error(`[KnowledgeBank] YouTube extraction error:`, error);
    throw new Error(
      `Failed to extract YouTube transcript: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generate embeddings for text chunks
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embeddings error: ${error}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return data.data.map((item) => item.embedding);
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

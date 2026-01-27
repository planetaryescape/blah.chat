/**
 * Knowledge Bank Processing
 *
 * Handles extraction, chunking, and embedding generation for knowledge sources.
 */

import { generateText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "@/lib/ai/gateway";
import {
  DOCUMENT_EXTRACTION_MODEL,
  EMBEDDING_MODEL,
} from "@/lib/ai/operational-models";
import { getModel } from "@/lib/ai/registry";
import { calculateCost } from "@/lib/ai/utils";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import {
  CHARS_PER_TOKEN,
  CHUNK_SIZE_CHARS,
  chunkText,
  OVERLAP_SIZE_CHARS,
} from "../files/chunking";
import { logger } from "../lib/logger";
import { EMBEDDING_BATCH_SIZE } from "./constants";
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
    logger.info("Processing source", {
      tag: "KnowledgeBank",
      sourceId: args.sourceId,
    });

    // Get source
    const source = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.knowledgeBank.index.getSource,
      { sourceId: args.sourceId },
    )) as Doc<"knowledgeSources"> | null;

    if (!source) {
      logger.error("Source not found", {
        tag: "KnowledgeBank",
        sourceId: args.sourceId,
      });
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
          // Extract YouTube transcript (with Gemini fallback)
          const ytResult = await extractYouTubeContent(
            ctx,
            source.videoMetadata!.videoId,
            source.userId,
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
      logger.info("Generating embeddings", {
        tag: "KnowledgeBank",
        chunkCount: chunks.length,
      });

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

        logger.info("Processed batch", {
          tag: "KnowledgeBank",
          batch: Math.floor(i / EMBEDDING_BATCH_SIZE) + 1,
          total: Math.ceil(chunks.length / EMBEDDING_BATCH_SIZE),
        });
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

      logger.info("Completed processing", {
        tag: "KnowledgeBank",
        sourceId: args.sourceId,
        chunkCount: chunks.length,
      });
    } catch (error) {
      logger.error("Error processing source", {
        tag: "KnowledgeBank",
        sourceId: args.sourceId,
        error: String(error),
      });

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
    logger.info("Firecrawl not configured, using simple fetch", {
      tag: "KnowledgeBank",
    });
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
  userId: Id<"users">,
): Promise<{ transcript: string; chunks: ProcessedChunk[] }> {
  // Try to get transcript using YouTube's API or a transcript service
  // For now, we'll use a simple approach with the youtube-transcript package
  // In production, you might want to use the official YouTube API

  try {
    // Validate videoId format to prevent URL injection
    const videoIdPattern = /^[A-Za-z0-9_-]{1,64}$/;
    if (!videoIdPattern.test(videoId)) {
      throw new Error("Invalid YouTube videoId format");
    }

    // Use Gemini to extract/transcribe if available
    // For MVP: Use a transcript extraction service
    const url = new URL("https://yt-transcript-api.vercel.app/api/transcript");
    url.searchParams.set("videoId", videoId);

    const response = await fetch(url.toString());

    if (!response.ok) {
      // Fallback: Use Gemini 2.0 Flash to analyze the video
      logger.info("Transcript API failed, trying Gemini fallback", {
        tag: "KnowledgeBank",
        videoId,
      });

      try {
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

        const result = await generateText({
          model: getModel(DOCUMENT_EXTRACTION_MODEL.id),
          providerOptions: getGatewayOptions(
            DOCUMENT_EXTRACTION_MODEL.id,
            undefined,
            ["knowledge-bank", "youtube"],
          ),
          messages: [
            {
              role: "user",
              content: [
                { type: "file", data: youtubeUrl, mediaType: "video/mp4" },
                {
                  type: "text",
                  text: `Watch this YouTube video and provide a comprehensive summary for knowledge retrieval.

Include:
- Overview (2-3 sentences)
- Key points and concepts covered
- Notable quotes or statements (paraphrased)
- Main conclusions or takeaways

Be thorough - this will be used for search and retrieval.`,
                },
              ],
            },
          ],
          maxOutputTokens: 8000,
        });

        // Track usage
        const inputTokens = result.usage?.inputTokens ?? 0;
        const outputTokens = result.usage?.outputTokens ?? 0;
        const cost = calculateCost(DOCUMENT_EXTRACTION_MODEL.id, {
          inputTokens,
          outputTokens,
        });

        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.usage.mutations.recordTextGeneration,
          {
            userId,
            model: DOCUMENT_EXTRACTION_MODEL.id,
            inputTokens,
            outputTokens,
            cost,
            feature: "files",
          },
        );

        logger.info("Gemini summary generated", {
          tag: "KnowledgeBank",
          videoId,
          inputTokens,
          outputTokens,
          cost: cost.toFixed(4),
        });

        // Prepend marker for UI detection
        const summary = `[AI Video Summary]\n\n${result.text}`;
        const chunks = chunkText(summary).map((c) => ({
          content: c.content,
          chunkIndex: c.chunkIndex,
          charOffset: c.metadata.charOffset,
          tokenCount: c.metadata.tokenCount,
        }));

        return { transcript: summary, chunks };
      } catch (geminiError) {
        // Both failed - graceful degradation
        logger.error("Gemini fallback failed", {
          tag: "KnowledgeBank",
          videoId,
          error: String(geminiError),
        });
        return {
          transcript: `YouTube video: ${videoId}. Transcript and AI analysis unavailable.`,
          chunks: [
            {
              content: `YouTube video: ${videoId}. Both transcript extraction and AI analysis failed.`,
              chunkIndex: 0,
              charOffset: 0,
              tokenCount: 20,
            },
          ],
        };
      }
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
    logger.error("YouTube extraction error", {
      tag: "KnowledgeBank",
      error: String(error),
    });
    throw new Error(
      `Failed to extract YouTube transcript: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generate embeddings for text chunks using AI Gateway
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embedMany } = await import("ai");
  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: texts,
  });
  return embeddings;
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

"use node";
/**
 * LLM-Based Document Extraction
 * Uses Grok 4.1 Fast for text extraction from documents.
 *
 * Strategy:
 * - PDF: Page-by-page extraction (send document once, request each page)
 * - DOCX/HTML: Section-based extraction
 * - CSV: Row-batch extraction
 * - Code/Text/MD: Direct text (no LLM needed)
 *
 * Benefits:
 * - Document cached after first request (faster subsequent pages)
 * - Handles complex formats (scanned PDFs, images in docs)
 * - Consistent output format
 */

import { generateText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { DOCUMENT_EXTRACTION_MODEL } from "@/lib/ai/operational-models";
import { getModel } from "@/lib/ai/registry";
import { calculateCost } from "@/lib/ai/utils";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import { logger } from "../lib/logger";

// Usage tracking context
interface UsageContext {
  ctx: ActionCtx;
  userId: Id<"users">;
}

// Helper to track usage after LLM call
async function trackUsage(
  usageCtx: UsageContext,
  usage: { inputTokens?: number; outputTokens?: number } | undefined,
) {
  if (!usage) return;

  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;

  const cost = calculateCost(DOCUMENT_EXTRACTION_MODEL.id, {
    inputTokens,
    outputTokens,
  });

  await (usageCtx.ctx.runMutation as any)(
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    internal.usage.mutations.recordTextGeneration,
    {
      userId: usageCtx.userId,
      model: DOCUMENT_EXTRACTION_MODEL.id,
      inputTokens,
      outputTokens,
      cost,
      feature: "files",
    },
  );
}

// File type categories
const TEXT_TYPES = [
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/javascript",
  "application/typescript",
  "text/javascript",
  "text/typescript",
  "text/css",
  "text/html",
  "application/json",
  "text/csv",
  "text/xml",
  "application/xml",
];

const PDF_TYPES = ["application/pdf"];

const DOCX_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

// Extraction prompts
const PDF_PAGE_EXTRACTION_PROMPT = (pageNum: number, totalPages: number) => `
Extract ALL text content from page ${pageNum} of ${totalPages} of this PDF document.

Rules:
- Extract text EXACTLY as it appears (preserve formatting where possible)
- Include headers, footers, captions, table content
- If the page is blank or has no text, respond with "[BLANK PAGE]"
- Do NOT summarize or interpret - extract verbatim
- For tables, preserve structure using markdown table format
- For code blocks, wrap in triple backticks

Output the extracted text directly, no preamble.
`;

const DOCUMENT_EXTRACTION_PROMPT = `
Extract ALL text content from this document.

Rules:
- Extract text EXACTLY as it appears
- Preserve document structure (headings, lists, tables)
- For tables, use markdown table format
- For code blocks, wrap in triple backticks
- Do NOT summarize or interpret - extract verbatim

Output the extracted text directly, no preamble.
`;

const _CSV_BATCH_EXTRACTION_PROMPT = (startRow: number, endRow: number) => `
Extract rows ${startRow} to ${endRow} from this CSV file.

Rules:
- Output as plain text, one row per line
- Preserve column separators (commas)
- Include any quoted values exactly as they appear
- Do NOT include header row unless it's within the requested range

Output the extracted rows directly, no preamble.
`;

/**
 * Extract text from a file using LLM or direct text extraction
 */
export const extractText = internalAction({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args): Promise<string> => {
    // Get file metadata
    const file = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.lib.helpers.getFile,
      { fileId: args.fileId },
    )) as Doc<"files"> | null;

    if (!file) {
      throw new Error("File not found");
    }

    // Create usage context for cost tracking
    const usageCtx: UsageContext = {
      ctx,
      userId: file.userId,
    };

    // Get file content from storage
    const blob = await ctx.storage.get(file.storageId);
    if (!blob) {
      throw new Error("File content not found in storage");
    }

    const mimeType = file.mimeType.toLowerCase();

    // Route based on file type
    if (
      TEXT_TYPES.some(
        (t) => mimeType.includes(t) || mimeType.startsWith("text/"),
      )
    ) {
      // Direct text extraction - no LLM needed
      const text = await blob.text();
      logger.info("Direct text extraction", {
        tag: "Extraction",
        fileName: file.name,
        charCount: text.length,
      });
      return text;
    }

    if (PDF_TYPES.includes(mimeType)) {
      // PDF: Page-by-page LLM extraction
      return await extractPdfWithLlm(blob, file.name, usageCtx);
    }

    if (DOCX_TYPES.includes(mimeType)) {
      // DOCX: LLM extraction
      return await extractDocWithLlm(blob, file.name, usageCtx);
    }

    // Fallback: Try direct text extraction
    try {
      const text = await blob.text();
      if (text && text.trim().length > 0) {
        logger.info("Fallback text extraction", {
          tag: "Extraction",
          fileName: file.name,
          charCount: text.length,
        });
        return text;
      }
    } catch {
      // Not a text file
    }

    // Last resort: LLM extraction for unknown types
    return await extractGenericWithLlm(blob, file.name, mimeType, usageCtx);
  },
});

/**
 * Extract text from storage directly (for Knowledge Bank)
 * Does not require a files table record
 */
export const extractTextFromStorage = internalAction({
  args: {
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileName: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<string> => {
    // Create usage context for cost tracking
    const usageCtx: UsageContext = {
      ctx,
      userId: args.userId,
    };

    // Get file content from storage
    const blob = await ctx.storage.get(args.storageId);
    if (!blob) {
      throw new Error("File content not found in storage");
    }

    const mimeType = args.mimeType.toLowerCase();

    // Route based on file type
    if (
      TEXT_TYPES.some(
        (t) => mimeType.includes(t) || mimeType.startsWith("text/"),
      )
    ) {
      const text = await blob.text();
      logger.info("Direct text extraction", {
        tag: "Extraction",
        fileName: args.fileName,
        charCount: text.length,
      });
      return text;
    }

    if (PDF_TYPES.includes(mimeType)) {
      return await extractPdfWithLlm(blob, args.fileName, usageCtx);
    }

    if (DOCX_TYPES.includes(mimeType)) {
      return await extractDocWithLlm(blob, args.fileName, usageCtx);
    }

    // Fallback: Try direct text extraction
    try {
      const text = await blob.text();
      if (text && text.trim().length > 0) {
        logger.info("Fallback text extraction", {
          tag: "Extraction",
          fileName: args.fileName,
          charCount: text.length,
        });
        return text;
      }
    } catch {
      // Not a text file
    }

    // Last resort: LLM extraction for unknown types
    return await extractGenericWithLlm(blob, args.fileName, mimeType, usageCtx);
  },
});

/**
 * Extract text from PDF using LLM page-by-page
 * Document is cached after first request for faster subsequent pages
 */
async function extractPdfWithLlm(
  blob: Blob,
  fileName: string,
  usageCtx: UsageContext,
): Promise<string> {
  const startTime = Date.now();
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  // First, get page count estimate (assume 1 page per 3000 bytes as rough estimate)
  // For more accurate page count, we'd need a PDF library
  const estimatedPages = Math.max(1, Math.ceil(arrayBuffer.byteLength / 50000));
  const maxPages = Math.min(estimatedPages, 100); // Cap at 100 pages

  logger.info("PDF extraction started", {
    tag: "Extraction",
    fileName,
    estimatedPages: maxPages,
  });

  const extractedPages: string[] = [];

  // Extract page by page
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    try {
      const result = await generateText({
        model: getModel(DOCUMENT_EXTRACTION_MODEL.id),
        providerOptions: getGatewayOptions(
          DOCUMENT_EXTRACTION_MODEL.id,
          undefined,
          ["document-extraction"],
        ),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file",
                data: base64,
                mediaType: "application/pdf",
              },
              {
                type: "text",
                text: PDF_PAGE_EXTRACTION_PROMPT(pageNum, maxPages),
              },
            ],
          },
        ],
        maxOutputTokens: 16000,
      });

      // Track usage for each page extraction
      await trackUsage(usageCtx, result.usage);

      const pageText = result.text.trim();

      // Check if we've reached the end (blank pages or repeated content)
      if (pageText === "[BLANK PAGE]" || pageText.length < 10) {
        if (extractedPages.length > 0) {
          // Likely reached end of document
          logger.info("PDF ended early", {
            tag: "Extraction",
            lastPage: pageNum - 1,
          });
          break;
        }
      }

      extractedPages.push(`--- Page ${pageNum} ---\n${pageText}`);

      // Log progress every 5 pages
      if (pageNum % 5 === 0) {
        logger.info("PDF extraction progress", {
          tag: "Extraction",
          currentPage: pageNum,
          totalPages: maxPages,
        });
      }
    } catch (error: any) {
      logger.error("PDF page extraction error", {
        tag: "Extraction",
        pageNum,
        error: String(error.message),
      });
      // Continue with next page on error
      if (extractedPages.length === 0) {
        throw new Error(`Failed to extract PDF: ${error.message}`);
      }
      break;
    }
  }

  const fullText = extractedPages.join("\n\n");
  const duration = Date.now() - startTime;
  logger.info("PDF extraction complete", {
    tag: "Extraction",
    fileName,
    pageCount: extractedPages.length,
    charCount: fullText.length,
    durationMs: duration,
  });

  return fullText;
}

/**
 * Extract text from DOCX using LLM
 */
async function extractDocWithLlm(
  blob: Blob,
  fileName: string,
  usageCtx: UsageContext,
): Promise<string> {
  const startTime = Date.now();
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  logger.info("DOCX extraction started", { tag: "Extraction", fileName });

  const result = await generateText({
    model: getModel(DOCUMENT_EXTRACTION_MODEL.id),
    providerOptions: getGatewayOptions(
      DOCUMENT_EXTRACTION_MODEL.id,
      undefined,
      ["document-extraction"],
    ),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            data: base64,
            mediaType: mimeType,
          },
          {
            type: "text",
            text: DOCUMENT_EXTRACTION_PROMPT,
          },
        ],
      },
    ],
    maxOutputTokens: 32000,
  });

  // Track usage
  await trackUsage(usageCtx, result.usage);

  const text = result.text.trim();
  const duration = Date.now() - startTime;
  logger.info("DOCX extraction complete", {
    tag: "Extraction",
    fileName,
    charCount: text.length,
    durationMs: duration,
  });

  return text;
}

/**
 * Extract text from generic file using LLM
 */
async function extractGenericWithLlm(
  blob: Blob,
  fileName: string,
  mimeType: string,
  usageCtx: UsageContext,
): Promise<string> {
  const startTime = Date.now();
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  logger.info("Generic extraction started", {
    tag: "Extraction",
    fileName,
    mimeType,
  });

  const result = await generateText({
    model: getModel(DOCUMENT_EXTRACTION_MODEL.id),
    providerOptions: getGatewayOptions(
      DOCUMENT_EXTRACTION_MODEL.id,
      undefined,
      ["document-extraction"],
    ),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            data: base64,
            mediaType: mimeType,
          },
          {
            type: "text",
            text: DOCUMENT_EXTRACTION_PROMPT,
          },
        ],
      },
    ],
    maxOutputTokens: 32000,
  });

  // Track usage
  await trackUsage(usageCtx, result.usage);

  const text = result.text.trim();
  const duration = Date.now() - startTime;
  logger.info("Generic extraction complete", {
    tag: "Extraction",
    fileName,
    charCount: text.length,
    durationMs: duration,
  });

  return text;
}

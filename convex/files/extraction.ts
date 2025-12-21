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
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

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
      console.log(
        `[Extraction] Direct text: ${file.name} (${text.length} chars)`,
      );
      return text;
    }

    if (PDF_TYPES.includes(mimeType)) {
      // PDF: Page-by-page LLM extraction
      return await extractPdfWithLlm(blob, file.name);
    }

    if (DOCX_TYPES.includes(mimeType)) {
      // DOCX: LLM extraction
      return await extractDocWithLlm(blob, file.name);
    }

    // Fallback: Try direct text extraction
    try {
      const text = await blob.text();
      if (text && text.trim().length > 0) {
        console.log(
          `[Extraction] Fallback text: ${file.name} (${text.length} chars)`,
        );
        return text;
      }
    } catch {
      // Not a text file
    }

    // Last resort: LLM extraction for unknown types
    return await extractGenericWithLlm(blob, file.name, mimeType);
  },
});

/**
 * Extract text from PDF using LLM page-by-page
 * Document is cached after first request for faster subsequent pages
 */
async function extractPdfWithLlm(
  blob: Blob,
  fileName: string,
): Promise<string> {
  const startTime = Date.now();
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUrl = `data:application/pdf;base64,${base64}`;

  // First, get page count estimate (assume 1 page per 3000 bytes as rough estimate)
  // For more accurate page count, we'd need a PDF library
  const estimatedPages = Math.max(1, Math.ceil(arrayBuffer.byteLength / 50000));
  const maxPages = Math.min(estimatedPages, 100); // Cap at 100 pages

  console.log(`[Extraction] PDF: ${fileName} (~${maxPages} pages estimated)`);

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
                data: dataUrl,
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

      const pageText = result.text.trim();

      // Check if we've reached the end (blank pages or repeated content)
      if (pageText === "[BLANK PAGE]" || pageText.length < 10) {
        if (extractedPages.length > 0) {
          // Likely reached end of document
          console.log(`[Extraction] PDF ended at page ${pageNum - 1}`);
          break;
        }
      }

      extractedPages.push(`--- Page ${pageNum} ---\n${pageText}`);

      // Log progress every 5 pages
      if (pageNum % 5 === 0) {
        console.log(`[Extraction] PDF progress: ${pageNum}/${maxPages} pages`);
      }
    } catch (error: any) {
      console.error(`[Extraction] PDF page ${pageNum} error:`, error.message);
      // Continue with next page on error
      if (extractedPages.length === 0) {
        throw new Error(`Failed to extract PDF: ${error.message}`);
      }
      break;
    }
  }

  const fullText = extractedPages.join("\n\n");
  const duration = Date.now() - startTime;
  console.log(
    `[Extraction] PDF complete: ${fileName} - ${extractedPages.length} pages, ${fullText.length} chars (${duration}ms)`,
  );

  return fullText;
}

/**
 * Extract text from DOCX using LLM
 */
async function extractDocWithLlm(
  blob: Blob,
  fileName: string,
): Promise<string> {
  const startTime = Date.now();
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const dataUrl = `data:${mimeType};base64,${base64}`;

  console.log(`[Extraction] DOCX: ${fileName}`);

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
            data: dataUrl,
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

  const text = result.text.trim();
  const duration = Date.now() - startTime;
  console.log(
    `[Extraction] DOCX complete: ${fileName} - ${text.length} chars (${duration}ms)`,
  );

  return text;
}

/**
 * Extract text from generic file using LLM
 */
async function extractGenericWithLlm(
  blob: Blob,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const startTime = Date.now();
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  console.log(`[Extraction] Generic: ${fileName} (${mimeType})`);

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
            data: dataUrl,
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

  const text = result.text.trim();
  const duration = Date.now() - startTime;
  console.log(
    `[Extraction] Generic complete: ${fileName} - ${text.length} chars (${duration}ms)`,
  );

  return text;
}

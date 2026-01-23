import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { logger } from "../../lib/logger";

export function createFileDocumentTool(
  ctx: ActionCtx,
  _conversationId: Id<"conversations">,
  messageAttachments?: Array<{
    type: "file" | "image" | "audio";
    name: string;
    storageId: string;
    mimeType: string;
    size: number;
    // Pre-extracted text (populated at upload time)
    extractedText?: string;
    extractedAt?: number;
    extractionError?: string;
  }>,
) {
  return tool({
    description:
      "Read and extract content from uploaded documents. Supports PDF, DOCX (Word), PPTX (PowerPoint), XLSX/XLS (Excel/spreadsheets), and text files. Use this when the user uploads a file and asks to analyze, summarize, or extract information from it.",
    inputSchema: z.object({
      fileIndex: z
        .number()
        .min(0)
        .describe(
          "Index of the file in the message attachments (0 for first file, 1 for second, etc.)",
        ),
      action: z
        .enum(["read", "extract"])
        .default("read")
        .describe(
          "Action to perform: 'read' returns full text content, 'extract' returns structured data",
        ),
    }),
    execute: async ({ fileIndex, action }) => {
      logger.info("Executing", {
        tag: "Tool:fileDocument",
        fileIndex,
        action,
        attachmentsAvailable: messageAttachments?.length ?? 0,
      });

      // Check if attachments exist
      if (!messageAttachments || messageAttachments.length === 0) {
        logger.error("No attachments found in message", {
          tag: "Tool:fileDocument",
        });
        return {
          success: false,
          error: "No files attached to this message",
        };
      }

      // Validate file index
      if (fileIndex >= messageAttachments.length) {
        logger.error("File index out of range", {
          tag: "Tool:fileDocument",
          fileIndex,
          totalFiles: messageAttachments.length,
        });
        return {
          success: false,
          error: `File index ${fileIndex} out of range. ${messageAttachments.length} file(s) attached.`,
        };
      }

      const attachment = messageAttachments[fileIndex];
      logger.info("Processing attachment", {
        tag: "Tool:fileDocument",
        name: attachment.name,
        type: attachment.type,
        mimeType: attachment.mimeType,
        size: attachment.size,
        storageId: attachment.storageId,
        hasExtractedText: !!attachment.extractedText,
      });

      // Only process file types (not images/audio)
      if (attachment.type !== "file") {
        logger.error("Wrong attachment type", {
          tag: "Tool:fileDocument",
          type: attachment.type,
        });
        return {
          success: false,
          error: `Cannot process ${attachment.type} attachments. Only file documents are supported.`,
        };
      }

      // Check for pre-extracted text (populated at upload time)
      if (attachment.extractedText) {
        logger.info("Using cached extraction", {
          tag: "Tool:fileDocument",
          fileName: attachment.name,
        });
        const wordCount = attachment.extractedText
          .split(/\s+/)
          .filter((w) => w.length > 0).length;
        return {
          success: true,
          fileName: attachment.name,
          mimeType: attachment.mimeType,
          action,
          content: attachment.extractedText,
          wordCount,
          characterCount: attachment.extractedText.length,
          truncated: false, // Already truncated at extraction time
          cached: true, // Indicate this was from cache
        };
      }

      // Check if extraction failed
      if (attachment.extractionError) {
        logger.warn("Extraction previously failed", {
          tag: "Tool:fileDocument",
          error: attachment.extractionError,
        });
        // Fall through to try again on-demand
      }

      try {
        // Fallback: Process the document on-demand (extraction not yet complete or failed)
        logger.info("Processing on-demand", {
          tag: "Tool:fileDocument",
          fileName: attachment.name,
        });
        const result = await ctx.runAction(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.tools.fileDocument.processDocument,
          {
            storageId: attachment.storageId,
            fileName: attachment.name,
            mimeType: attachment.mimeType,
            action,
          },
        );

        if (result.success) {
          logger.info("Processing succeeded", {
            tag: "Tool:fileDocument",
            fileName: attachment.name,
            wordCount: result.wordCount,
          });
        } else {
          logger.error("Processing failed", {
            tag: "Tool:fileDocument",
            error: result.error,
          });
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("Exception during processing", {
          tag: "Tool:fileDocument",
          fileName: attachment.name,
          error: errorMessage,
        });
        return {
          success: false,
          error: `Failed to process document: ${errorMessage}`,
        };
      }
    },
  });
}

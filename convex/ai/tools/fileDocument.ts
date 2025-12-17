import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

export function createFileDocumentTool(
  ctx: ActionCtx,
  _conversationId: Id<"conversations">,
  messageAttachments?: Array<{
    type: "file" | "image" | "audio";
    name: string;
    storageId: string;
    mimeType: string;
    size: number;
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
      console.log(
        `[Tool:fileDocument] Executing with fileIndex=${fileIndex}, action=${action}`,
      );
      console.log(
        `[Tool:fileDocument] Attachments available:`,
        messageAttachments?.length ?? 0,
      );

      // Check if attachments exist
      if (!messageAttachments || messageAttachments.length === 0) {
        console.error("[Tool:fileDocument] ❌ No attachments found in message");
        return {
          success: false,
          error: "No files attached to this message",
        };
      }

      // Validate file index
      if (fileIndex >= messageAttachments.length) {
        console.error(
          `[Tool:fileDocument] ❌ File index ${fileIndex} out of range (${messageAttachments.length} files)`,
        );
        return {
          success: false,
          error: `File index ${fileIndex} out of range. ${messageAttachments.length} file(s) attached.`,
        };
      }

      const attachment = messageAttachments[fileIndex];
      console.log(`[Tool:fileDocument] Processing:`, {
        name: attachment.name,
        type: attachment.type,
        mimeType: attachment.mimeType,
        size: attachment.size,
        storageId: attachment.storageId,
      });

      // Only process file types (not images/audio)
      if (attachment.type !== "file") {
        console.error(
          `[Tool:fileDocument] ❌ Wrong attachment type: ${attachment.type}`,
        );
        return {
          success: false,
          error: `Cannot process ${attachment.type} attachments. Only file documents are supported.`,
        };
      }

      try {
        // Process the document
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
          console.log(
            `[Tool:fileDocument] ✅ Success: ${attachment.name} (${result.wordCount} words)`,
          );
        } else {
          console.error(
            `[Tool:fileDocument] ❌ Processing failed:`,
            result.error,
          );
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`[Tool:fileDocument] ❌ Exception during processing:`, {
          fileName: attachment.name,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        });
        return {
          success: false,
          error: `Failed to process document: ${errorMessage}`,
        };
      }
    },
  });
}

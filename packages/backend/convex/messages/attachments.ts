import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, internalMutation, query } from "../_generated/server";
import { logger } from "../lib/logger";

// MIME types that support text extraction
const EXTRACTABLE_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
  "application/vnd.ms-excel", // XLS
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
  "application/vnd.ms-powerpoint", // PPT
  "text/plain",
  "text/markdown",
  "text/csv",
];

function isExtractable(mimeType: string): boolean {
  return (
    EXTRACTABLE_MIME_TYPES.includes(mimeType) || mimeType.startsWith("text/")
  );
}

// ===== Internal Mutations =====

export const addAttachment = internalMutation({
  args: {
    messageId: v.id("messages"),
    attachment: v.object({
      type: v.union(v.literal("file"), v.literal("image"), v.literal("audio")),
      storageId: v.string(),
      name: v.string(),
      size: v.number(),
      mimeType: v.string(),
      metadata: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const attachmentId = await ctx.db.insert("attachments", {
      messageId: args.messageId,
      conversationId: message.conversationId,
      userId: message.userId!,
      type: args.attachment.type,
      name: args.attachment.name,
      storageId: args.attachment.storageId as Id<"_storage">,
      mimeType: args.attachment.mimeType,
      size: args.attachment.size,
      metadata: args.attachment.metadata,
      createdAt: Date.now(),
    });

    // Schedule text extraction for extractable file types (not images/audio)
    if (isExtractable(args.attachment.mimeType)) {
      await ctx.scheduler.runAfter(
        0,
        // @ts-ignore - Type depth exceeded with complex Convex action
        internal.messages.attachments.extractText,
        {
          attachmentId,
          storageId: args.attachment.storageId,
          fileName: args.attachment.name,
          mimeType: args.attachment.mimeType,
        },
      );
    }
  },
});

/**
 * Update attachment with extracted text (called after extraction completes)
 */
export const updateExtractedText = internalMutation({
  args: {
    attachmentId: v.id("attachments"),
    extractedText: v.optional(v.string()),
    extractionError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.attachmentId, {
      extractedText: args.extractedText,
      extractedAt: Date.now(),
      extractionError: args.extractionError,
    });
  },
});

/**
 * Extract text from attachment and store in DB
 * Scheduled immediately after attachment upload for extractable file types
 */
export const extractText = internalAction({
  args: {
    attachmentId: v.id("attachments"),
    storageId: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Reuse existing processDocument logic
      const result = (await ctx.runAction(
        // @ts-ignore - Type depth exceeded with complex Convex action
        internal.tools.fileDocument.processDocument,
        {
          storageId: args.storageId,
          fileName: args.fileName,
          mimeType: args.mimeType,
          action: "extract" as const,
        },
      )) as {
        success: boolean;
        content?: string;
        error?: string;
      };

      if (result.success && result.content) {
        // Store extracted text (already truncated to 50KB by processDocument)
        await ctx.runMutation(
          // @ts-ignore - Type depth exceeded
          internal.messages.attachments.updateExtractedText,
          {
            attachmentId: args.attachmentId,
            extractedText: result.content,
          },
        );
      } else {
        // Store error for debugging
        await ctx.runMutation(
          // @ts-ignore - Type depth exceeded
          internal.messages.attachments.updateExtractedText,
          {
            attachmentId: args.attachmentId,
            extractionError: result.error || "Unknown extraction error",
          },
        );
      }
    } catch (error) {
      logger.error("Attachment extraction failed", {
        tag: "Attachment Extraction",
        error: String(error),
      });
      await ctx.runMutation(
        // @ts-ignore - Type depth exceeded
        internal.messages.attachments.updateExtractedText,
        {
          attachmentId: args.attachmentId,
          extractionError:
            error instanceof Error ? error.message : "Extraction failed",
        },
      );
    }
  },
});

// ===== Query Helpers =====

async function getMessageAttachments(
  ctx: any,
  messageId: Id<"messages">,
): Promise<any[]> {
  return await ctx.db
    .query("attachments")
    .withIndex("by_message", (q: any) => q.eq("messageId", messageId))
    .collect();
}

// ===== Public Queries =====

export const getAttachments = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    return getMessageAttachments(ctx, messageId);
  },
});

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, query } from "../_generated/server";

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

    await ctx.db.insert("attachments", {
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

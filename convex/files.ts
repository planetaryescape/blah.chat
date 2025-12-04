import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrCreate, getCurrentUser } from "./lib/userSync";

/**
 * Generate upload URL for file storage
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUserOrCreate(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save file metadata after upload
 */
export const saveFile = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const fileId = await ctx.db.insert("files", {
      userId: user._id,
      conversationId: args.conversationId,
      storageId: args.storageId,
      name: args.name,
      mimeType: args.mimeType,
      size: args.size,
      createdAt: Date.now(),
    });

    return fileId;
  },
});

/**
 * Get file URL for display/download
 */
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * List files for a conversation
 */
export const listByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const files = await ctx.db
      .query("files")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // Get URLs for all files
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId);
        return { ...file, url };
      })
    );

    return filesWithUrls;
  },
});

/**
 * Delete file
 */
export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const file = await ctx.db.get(args.fileId);

    if (!file || file.userId !== user._id) {
      throw new Error("File not found");
    }

    // Delete from storage
    await ctx.storage.delete(file.storageId);

    // Delete metadata
    await ctx.db.delete(args.fileId);
  },
});

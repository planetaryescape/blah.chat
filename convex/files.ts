import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

/**
 * Generate upload URL for file storage
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const _user = await getCurrentUserOrCreate(ctx);
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
 * Get file URL for display/download (requires ownership verification)
 */
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    // Security: Verify user owns a file with this storage ID
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    // Find file record to verify ownership
    const files = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const file = files.find(f => f.storageId === args.storageId);
    if (!file) return null;

    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Get URLs for multiple attachments (batch fetch with ownership verification)
 * Only returns URLs for files the user owns or has access to via conversation
 */
export const getAttachmentUrls = query({
  args: {
    storageIds: v.array(v.string()),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    // Security: Verify user is authenticated
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // If conversationId provided, verify ownership
    if (args.conversationId) {
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation || conversation.userId !== user._id) {
        return [];
      }
    }

    // Get user's files to verify ownership
    const userFiles = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Convert to string set for comparison (storageId in files table is Id<"_storage">)
    const userStorageIds = new Set(userFiles.map(f => String(f.storageId)));

    // Only return URLs for files the user owns
    const validStorageIds = args.storageIds.filter(id => userStorageIds.has(id));

    return Promise.all(
      validStorageIds.map(async (id) => ({
        storageId: id,
        // @ts-ignore - id is validated as belonging to user's files
        url: await ctx.storage.getUrl(id),
      })),
    );
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
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // Get URLs for all files
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId);
        return { ...file, url };
      }),
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

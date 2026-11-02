import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { canAccessConversation } from "./conversations/branching";
import { logger } from "./lib/logger";
import { ownedUploadUrl } from "./lib/ownedUploads";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

/**
 * Generate upload URL for file storage
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUserOrCreate(ctx);
    return ownedUploadUrl(user._id);
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

    if (
      args.conversationId &&
      !(await canAccessConversation(ctx, args.conversationId, user._id))
    )
      throw new Error("Conversation not found or unauthorized");
    // Ownership is established by the signed upload HTTP endpoint, not by a
    // caller knowing an arbitrary storage ID (including a generated image).
    const file = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("storageId"), args.storageId))
      .first();
    if (!file) throw new Error("File not found or unauthorized");
    const metadata = await ctx.db.system.get(args.storageId);
    if (
      !metadata ||
      metadata.size !== args.size ||
      !Number.isFinite(args.size) ||
      args.size < 0
    )
      throw new Error("Invalid file metadata");

    const fileId = file._id;
    await ctx.db.patch(fileId, {
      userId: user._id,
      conversationId: args.conversationId,
      storageId: args.storageId,
      name: args.name,
      mimeType: args.mimeType,
      size: args.size,
      createdAt: Date.now(),
      // Initialize embedding status
      embeddingStatus: "pending",
    });

    // Trigger embedding generation for text files (async, non-blocking)
    // Only for supported file types: txt, md, markdown
    const supportedTypes = ["text/plain", "text/markdown"];
    const supportedExtensions = [".txt", ".md", ".markdown"];

    const isSupported =
      supportedTypes.includes(args.mimeType) ||
      supportedExtensions.some((ext) => args.name.toLowerCase().endsWith(ext));

    if (isSupported) {
      await ctx.scheduler.runAfter(
        0,
        internal.files.embeddings.generateFileEmbeddings,
        {
          fileId,
        },
      );
      logger.info("Scheduled embedding generation", {
        tag: "FileUpload",
        fileName: args.name,
      });
    } else {
      logger.info("Skipping embeddings (unsupported type)", {
        tag: "FileUpload",
        fileName: args.name,
        mimeType: args.mimeType,
      });
    }

    return fileId;
  },
});

// Only the verified upload endpoint may establish ownership of a new blob.
export const registerUpload = internalMutation({
  args: {
    userId: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = ctx.db.normalizeId("users", args.userId);
    if (!userId || !(await ctx.db.get(userId)))
      throw new Error("User not found");
    return ctx.db.insert("files", {
      ...args,
      userId,
      name: "Uploaded file",
      createdAt: Date.now(),
    });
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

    const file = files.find((f) => f.storageId === args.storageId);
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
      if (!(await canAccessConversation(ctx, args.conversationId, user._id))) {
        return [];
      }
    }

    // Get user's files to verify ownership
    const userFiles = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Convert to string set for comparison (storageId in files table is Id<"_storage">)
    const userStorageIds = new Set(userFiles.map((f) => String(f.storageId)));

    if (args.conversationId) {
      const attachments = await ctx.db
        .query("attachments")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", args.conversationId!),
        )
        .collect();
      for (const attachment of attachments)
        userStorageIds.add(String(attachment.storageId));
    }

    // Only return URLs for files the user owns
    const validStorageIds = args.storageIds.filter((id) =>
      userStorageIds.has(id),
    );

    return Promise.all(
      validStorageIds.map(async (id) => ({
        storageId: id,
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
    if (!(await canAccessConversation(ctx, args.conversationId, user._id)))
      return [];

    const files = await ctx.db
      .query("files")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
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
 * Get file with all its chunks (for detail view)
 * Returns file metadata and all chunks sorted by index
 */
export const getFileWithChunks = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    // Get file and verify ownership
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== user._id) return null;

    // Get file URL
    const url = await ctx.storage.getUrl(file.storageId);

    // Get all chunks for this file, sorted by index
    const chunks = await ctx.db
      .query("fileChunks")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .collect();

    // Sort by chunk index
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    // Return chunks without embeddings (too large for frontend)
    const chunksWithoutEmbeddings = chunks.map((chunk) => ({
      _id: chunk._id,
      _creationTime: chunk._creationTime,
      fileId: chunk.fileId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      startPage: chunk.startPage,
      endPage: chunk.endPage,
      section: chunk.section,
      charOffset: chunk.charOffset,
      tokenCount: chunk.tokenCount,
    }));

    return {
      ...file,
      url,
      chunks: chunksWithoutEmbeddings,
    };
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

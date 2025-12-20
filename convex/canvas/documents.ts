import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "../lib/userSync";

// Get active document for a conversation
export const getByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    return await ctx.db
      .query("canvasDocuments")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", user._id).eq("conversationId", conversationId),
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});

// Get document by ID
export const get = query({
  args: { documentId: v.id("canvasDocuments") },
  handler: async (ctx, { documentId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const doc = await ctx.db.get(documentId);
    if (!doc || doc.userId !== user._id) return null;

    return doc;
  },
});

// Create new document
export const create = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
    content: v.string(),
    language: v.optional(v.string()),
    documentType: v.union(v.literal("code"), v.literal("prose")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Archive any existing active document for this conversation
    const existing = await ctx.db
      .query("canvasDocuments")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", user._id).eq("conversationId", args.conversationId),
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "archived",
        updatedAt: Date.now(),
      });
    }

    const now = Date.now();
    const documentId = await ctx.db.insert("canvasDocuments", {
      userId: user._id,
      conversationId: args.conversationId,
      title: args.title,
      content: args.content,
      language: args.language,
      documentType: args.documentType,
      version: 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Create initial history entry
    await ctx.db.insert("canvasHistory", {
      documentId,
      userId: user._id,
      content: args.content,
      version: 1,
      source: "created",
      createdAt: now,
    });

    return documentId;
  },
});

// Update document content
export const updateContent = mutation({
  args: {
    documentId: v.id("canvasDocuments"),
    content: v.string(),
    source: v.union(v.literal("user_edit"), v.literal("llm_diff")),
    diff: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, content, source, diff }) => {
    const user = await getCurrentUserOrCreate(ctx);

    const doc = await ctx.db.get(documentId);
    if (!doc || doc.userId !== user._id) {
      throw new Error("Document not found");
    }

    const newVersion = doc.version + 1;
    const now = Date.now();

    // Update document
    await ctx.db.patch(documentId, {
      content,
      version: newVersion,
      updatedAt: now,
    });

    // Add history entry
    await ctx.db.insert("canvasHistory", {
      documentId,
      userId: user._id,
      content,
      version: newVersion,
      source,
      diff,
      createdAt: now,
    });

    return { version: newVersion };
  },
});

// Update document metadata (title, language)
export const updateMetadata = mutation({
  args: {
    documentId: v.id("canvasDocuments"),
    title: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, title, language }) => {
    const user = await getCurrentUserOrCreate(ctx);

    const doc = await ctx.db.get(documentId);
    if (!doc || doc.userId !== user._id) {
      throw new Error("Document not found");
    }

    const updates: { title?: string; language?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };

    if (title !== undefined) updates.title = title;
    if (language !== undefined) updates.language = language;

    await ctx.db.patch(documentId, updates);
  },
});

// Archive document
export const archive = mutation({
  args: { documentId: v.id("canvasDocuments") },
  handler: async (ctx, { documentId }) => {
    const user = await getCurrentUserOrCreate(ctx);

    const doc = await ctx.db.get(documentId);
    if (!doc || doc.userId !== user._id) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(documentId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// Internal queries/mutations for LLM tools (accept userId directly)
// ============================================================================

// Internal query for tools (no auth check - called from trusted actions)
export const getByConversationInternal = internalQuery({
  args: {
    userId: v.id("users"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { userId, conversationId }) => {
    return await ctx.db
      .query("canvasDocuments")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", userId).eq("conversationId", conversationId),
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});

// Internal mutation for tools to create documents
export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    title: v.string(),
    content: v.string(),
    language: v.optional(v.string()),
    documentType: v.union(v.literal("code"), v.literal("prose")),
  },
  handler: async (ctx, args) => {
    // Archive any existing active document
    const existing = await ctx.db
      .query("canvasDocuments")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", args.userId).eq("conversationId", args.conversationId),
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "archived",
        updatedAt: Date.now(),
      });
    }

    const now = Date.now();
    const documentId = await ctx.db.insert("canvasDocuments", {
      userId: args.userId,
      conversationId: args.conversationId,
      title: args.title,
      content: args.content,
      language: args.language,
      documentType: args.documentType,
      version: 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("canvasHistory", {
      documentId,
      userId: args.userId,
      content: args.content,
      version: 1,
      source: "created",
      createdAt: now,
    });

    return documentId;
  },
});

// Internal mutation for tools to update document content
export const updateContentInternal = internalMutation({
  args: {
    userId: v.id("users"),
    documentId: v.id("canvasDocuments"),
    content: v.string(),
    source: v.union(v.literal("user_edit"), v.literal("llm_diff")),
    diff: v.optional(v.string()),
  },
  handler: async (ctx, { userId, documentId, content, source, diff }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc || doc.userId !== userId) {
      throw new Error("Document not found");
    }

    const newVersion = doc.version + 1;
    const now = Date.now();

    await ctx.db.patch(documentId, {
      content,
      version: newVersion,
      updatedAt: now,
    });

    await ctx.db.insert("canvasHistory", {
      documentId,
      userId,
      content,
      version: newVersion,
      source,
      diff,
      createdAt: now,
    });

    return { version: newVersion };
  },
});

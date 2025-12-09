import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

export const create = mutation({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    note: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Check if bookmark already exists
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .first();

    if (existing && existing.userId === user._id) {
      throw new Error("Message already bookmarked");
    }

    const bookmarkId = await ctx.db.insert("bookmarks", {
      userId: user._id,
      messageId: args.messageId,
      conversationId: args.conversationId,
      note: args.note,
      tags: args.tags || [],
      createdAt: Date.now(),
    });

    return bookmarkId;
  },
});

export const update = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    note: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const bookmark = await ctx.db.get(args.bookmarkId);

    if (!bookmark || bookmark.userId !== user._id) {
      throw new Error("Bookmark not found");
    }

    await ctx.db.patch(args.bookmarkId, {
      note: args.note !== undefined ? args.note : bookmark.note,
      tags: args.tags !== undefined ? args.tags : bookmark.tags,
    });
  },
});

export const remove = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const bookmark = await ctx.db.get(args.bookmarkId);

    if (!bookmark || bookmark.userId !== user._id) {
      throw new Error("Bookmark not found");
    }

    await ctx.db.delete(args.bookmarkId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Fetch associated messages and conversations
    const bookmarksWithData = await Promise.all(
      bookmarks.map(async (bookmark) => {
        const message = await ctx.db.get(bookmark.messageId);
        const conversation = await ctx.db.get(bookmark.conversationId);

        return {
          ...bookmark,
          message,
          conversation,
        };
      }),
    );

    // Sort by creation date (newest first)
    return bookmarksWithData.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getByMessage = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const bookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    return bookmark || null;
  },
});

export const searchByTags = query({
  args: {
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const allBookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Filter bookmarks that have at least one matching tag
    const filtered = allBookmarks.filter((bookmark) =>
      args.tags.some((tag) => bookmark.tags?.includes(tag)),
    );

    // Fetch associated messages and conversations
    const bookmarksWithData = await Promise.all(
      filtered.map(async (bookmark) => {
        const message = await ctx.db.get(bookmark.messageId);
        const conversation = await ctx.db.get(bookmark.conversationId);

        return {
          ...bookmark,
          message,
          conversation,
        };
      }),
    );

    return bookmarksWithData.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const bulkCreate = mutation({
  args: {
    messageIds: v.array(v.id("messages")),
    note: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const bookmarkIds = [];

    for (const messageId of args.messageIds) {
      const message = await ctx.db.get(messageId);
      if (!message) continue; // Skip missing

      // Get conversation to verify ownership
      const conv = await ctx.db.get(message.conversationId);
      if (!conv || conv.userId !== user._id) continue;

      // Check if already bookmarked
      const existing = await ctx.db
        .query("bookmarks")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("messageId"), messageId))
        .first();

      if (existing) {
        bookmarkIds.push(existing._id);
        continue;
      }

      // Create bookmark
      const bookmarkId = await ctx.db.insert("bookmarks", {
        userId: user._id,
        messageId,
        conversationId: message.conversationId,
        note: args.note,
        tags: args.tags || [],
        createdAt: Date.now(),
      });

      bookmarkIds.push(bookmarkId);
    }

    return {
      bookmarkedCount: bookmarkIds.length,
      bookmarkIds,
    };
  },
});

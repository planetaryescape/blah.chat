import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

/**
 * Phase 7: Batch fetch messages and conversations for bookmarks
 * Deduplicates IDs and creates lookup maps to eliminate N+1 queries
 */
async function batchFetchBookmarkData(
  db: DatabaseReader,
  bookmarks: Array<Doc<"bookmarks">>,
) {
  // Deduplicate IDs (multiple bookmarks may share same conversation)
  const messageIds = [...new Set(bookmarks.map((b) => b.messageId))];
  const conversationIds = [...new Set(bookmarks.map((b) => b.conversationId))];

  // Batch fetch both tables in parallel
  const [messages, conversations] = await Promise.all([
    Promise.all(messageIds.map((id) => db.get(id))),
    Promise.all(conversationIds.map((id) => db.get(id))),
  ]);

  // Create lookup maps (filter nulls from deleted entities)
  const messageMap = new Map(
    messages
      .filter((m): m is Doc<"messages"> => m !== null)
      .map((m) => [m._id, m]),
  );
  const conversationMap = new Map(
    conversations
      .filter((c): c is Doc<"conversations"> => c !== null)
      .map((c) => [c._id, c]),
  );

  return { messageMap, conversationMap };
}

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

    // Phase 7: Batch fetch to eliminate N+1 queries (2N → 2 queries)
    const { messageMap, conversationMap } = await batchFetchBookmarkData(
      ctx.db,
      bookmarks,
    );

    // Join in memory, filter deleted entities
    const bookmarksWithData = bookmarks
      .map((bookmark) => {
        const message = messageMap.get(bookmark.messageId);
        const conversation = conversationMap.get(bookmark.conversationId);

        // Skip if message or conversation deleted
        if (!message || !conversation) return null;

        return {
          ...bookmark,
          message,
          conversation,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);

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

    // Phase 7: Batch fetch to eliminate N+1 queries (2N → 2 queries)
    const { messageMap, conversationMap } = await batchFetchBookmarkData(
      ctx.db,
      filtered,
    );

    // Join in memory, filter deleted entities
    const bookmarksWithData = filtered
      .map((bookmark) => {
        const message = messageMap.get(bookmark.messageId);
        const conversation = conversationMap.get(bookmark.conversationId);

        // Skip if message or conversation deleted
        if (!message || !conversation) return null;

        return {
          ...bookmark,
          message,
          conversation,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);

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
    const bookmarkIds: Id<"bookmarks">[] = [];

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

// ============================================================================
// TAG OPERATIONS (DUAL-WRITE: Phase 5)
// ============================================================================

/**
 * Add a tag to bookmark (DUAL-WRITE: Phase 5)
 */
export const addTag = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    tag: v.string(),
  },
  handler: async (ctx, { bookmarkId, tag }) => {
    const user = await getCurrentUserOrCreate(ctx);
    const bookmark = await ctx.db.get(bookmarkId);

    if (!bookmark || bookmark.userId !== user._id) {
      throw new Error("Bookmark not found");
    }

    const currentTags = bookmark.tags || [];
    const cleanTag = tag.trim().toLowerCase();

    // Skip if duplicate
    if (currentTags.includes(cleanTag)) return;

    // NEW SYSTEM: Get or create tag
    const { normalizeTagSlug } = await import("../src/lib/utils/tagUtils");
    const slug = normalizeTagSlug(tag);

    let centralTag = await ctx.db
      .query("tags")
      .withIndex("by_user_slug", (q) =>
        q.eq("userId", user._id).eq("slug", slug),
      )
      .unique();

    if (!centralTag) {
      const now = Date.now();
      const tagId = await ctx.db.insert("tags", {
        slug,
        displayName: tag,
        userId: user._id,
        scope: "user",
        parentId: undefined,
        path: `/${slug}`,
        depth: 0,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      centralTag = (await ctx.db.get(tagId))!;
    }

    // Create junction entry
    const existingJunction = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark_tag", (q) =>
        q.eq("bookmarkId", bookmarkId).eq("tagId", centralTag._id),
      )
      .unique();

    if (!existingJunction) {
      await ctx.db.insert("bookmarkTags", {
        bookmarkId,
        tagId: centralTag._id,
        userId: user._id,
        createdAt: Date.now(),
      });

      await ctx.db.patch(centralTag._id, {
        usageCount: centralTag.usageCount + 1,
        updatedAt: Date.now(),
      });
    }

    // OLD SYSTEM: Write to array
    await ctx.db.patch(bookmarkId, {
      tags: [...currentTags, cleanTag],
    });
  },
});

/**
 * Remove a tag from bookmark (DUAL-WRITE: Phase 5)
 */
export const removeTag = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    tag: v.string(),
  },
  handler: async (ctx, { bookmarkId, tag }) => {
    const user = await getCurrentUserOrCreate(ctx);
    const bookmark = await ctx.db.get(bookmarkId);

    if (!bookmark || bookmark.userId !== user._id) {
      throw new Error("Bookmark not found");
    }

    // NEW SYSTEM: Find and delete junction entry
    const { normalizeTagSlug } = await import("../src/lib/utils/tagUtils");
    const slug = normalizeTagSlug(tag);

    const centralTag = await ctx.db
      .query("tags")
      .withIndex("by_user_slug", (q) =>
        q.eq("userId", user._id).eq("slug", slug),
      )
      .unique();

    if (centralTag) {
      const junction = await ctx.db
        .query("bookmarkTags")
        .withIndex("by_bookmark_tag", (q) =>
          q.eq("bookmarkId", bookmarkId).eq("tagId", centralTag._id),
        )
        .unique();

      if (junction) {
        await ctx.db.delete(junction._id);

        await ctx.db.patch(centralTag._id, {
          usageCount: Math.max(0, centralTag.usageCount - 1),
          updatedAt: Date.now(),
        });
      }
    }

    // OLD SYSTEM: Remove from array
    await ctx.db.patch(bookmarkId, {
      tags: (bookmark.tags || []).filter((t) => t !== tag),
    });
  },
});

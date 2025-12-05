import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { getCurrentUserOrCreate, getCurrentUser } from "./lib/userSync";

export const create = mutation({
  args: {
    model: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const conversationId = await ctx.db.insert("conversations", {
      userId: user._id,
      title: args.title || "New Chat",
      model: args.model,
      pinned: false,
      archived: false,
      starred: false,
      messageCount: 0,
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return conversationId;
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation || conversation.userId !== user._id) {
      return null;
    }

    return conversation;
  },
});

export const list = query({
  args: {
    searchQuery: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // SEARCH MODE: Use search index if query provided
    if (args.searchQuery?.trim()) {
      const query = ctx.db
        .query("conversations")
        .withSearchIndex("search_title", (q) =>
          q
            .search("title", args.searchQuery!)
            .eq("userId", user._id)
            .eq("archived", false),
        );

      const results = args.limit
        ? await query.take(args.limit)
        : await query.collect();

      return results.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return 0; // Maintain search relevance order
      });
    }

    // DEFAULT MODE: Recent conversations
    const query = ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("archived"), false));

    const convos = args.limit
      ? await query.take(args.limit)
      : await query.collect();

    // Sort: pinned first, then by lastMessageAt
    return convos.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.lastMessageAt - a.lastMessageAt;
    });
  },
});

export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    model: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversationId = await ctx.db.insert("conversations", {
      userId: args.userId,
      title: args.title || "New Chat",
      model: args.model,
      pinned: false,
      archived: false,
      starred: false,
      messageCount: 0,
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return conversationId;
  },
});

export const updateLastMessageAt = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const togglePin = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.conversationId, {
      pinned: !conv.pinned,
      updatedAt: Date.now(),
    });
  },
});

export const toggleStar = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.conversationId, {
      starred: !conv.starred,
      updatedAt: Date.now(),
    });
  },
});

export const archive = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.conversationId, {
      archived: true,
      updatedAt: Date.now(),
    });
  },
});

export const deleteConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) throw new Error("Not found");

    // 1. Delete bookmarks
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    for (const bookmark of bookmarks) {
      await ctx.db.delete(bookmark._id);
    }

    // 2. Delete shares
    const shares = await ctx.db
      .query("shares")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    for (const share of shares) {
      await ctx.db.delete(share._id);
    }

    // 3. Nullify files conversationId (files can exist independently)
    const files = await ctx.db
      .query("files")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    for (const file of files) {
      await ctx.db.patch(file._id, { conversationId: undefined });
    }

    // 4. Nullify memories conversationId (memories can exist independently)
    const memories = await ctx.db
      .query("memories")
      .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
      .collect();
    for (const memory of memories) {
      await ctx.db.patch(memory._id, { conversationId: undefined });
    }

    // 5. Remove from projects conversationIds arrays
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const project of projects) {
      if (project.conversationIds.includes(args.conversationId)) {
        await ctx.db.patch(project._id, {
          conversationIds: project.conversationIds.filter(
            (id) => id !== args.conversationId,
          ),
        });
      }
    }

    // 6. Delete messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // 7. Delete conversation
    await ctx.db.delete(args.conversationId);
  },
});

export const rename = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.conversationId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const updateTitle = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const getInternal = internalQuery({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const updateMemoryTracking = internalMutation({
  args: {
    id: v.id("conversations"),
    lastMemoryExtractionAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      lastMemoryExtractionAt: args.lastMemoryExtractionAt,
      updatedAt: Date.now(),
    });
  },
});

export const cleanupEmptyConversations = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Get all conversations for user
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();

    // Sort by lastMessageAt (most recent first)
    const sorted = conversations.sort(
      (a, b) => b.lastMessageAt - a.lastMessageAt,
    );

    // Find empty conversations (excluding the most recent one)
    const emptyConversations = sorted.filter(
      (c) => (c.messageCount || 0) === 0,
    );
    const toDelete = emptyConversations.slice(1); // Keep first (most recent), delete rest

    // Cascade delete empty conversations
    let deletedCount = 0;
    for (const conv of toDelete) {
      // 1. Delete bookmarks
      const bookmarks = await ctx.db
        .query("bookmarks")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const bookmark of bookmarks) {
        await ctx.db.delete(bookmark._id);
      }

      // 2. Delete shares
      const shares = await ctx.db
        .query("shares")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const share of shares) {
        await ctx.db.delete(share._id);
      }

      // 3. Nullify files conversationId
      const files = await ctx.db
        .query("files")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const file of files) {
        await ctx.db.patch(file._id, { conversationId: undefined });
      }

      // 4. Nullify memories conversationId
      const memories = await ctx.db
        .query("memories")
        .filter((q) => q.eq(q.field("conversationId"), conv._id))
        .collect();
      for (const memory of memories) {
        await ctx.db.patch(memory._id, { conversationId: undefined });
      }

      // 5. Remove from projects conversationIds arrays
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      for (const project of projects) {
        if (project.conversationIds.includes(conv._id)) {
          await ctx.db.patch(project._id, {
            conversationIds: project.conversationIds.filter(
              (id) => id !== conv._id,
            ),
          });
        }
      }

      // 6. Delete any messages (shouldn't be any, but just in case)
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      // 7. Delete conversation
      await ctx.db.delete(conv._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

export const updateTokenUsage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    tokenUsage: v.object({
      systemTokens: v.number(),
      messagesTokens: v.number(),
      memoriesTokens: v.number(),
      totalTokens: v.number(),
      contextLimit: v.number(),
      lastCalculatedAt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      tokenUsage: args.tokenUsage,
      updatedAt: Date.now(),
    });
  },
});

export const getTokenUsage = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      return null;
    }

    return conversation.tokenUsage || null;
  },
});

export const backfillMessageCounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const convos = await ctx.db.query("conversations").collect();
    let updated = 0;

    for (const conv of convos) {
      // Only backfill if messageCount is missing or undefined
      if (conv.messageCount === undefined || conv.messageCount === null) {
        const count = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .collect()
          .then((msgs) => msgs.length);

        await ctx.db.patch(conv._id, { messageCount: count });
        updated++;
      }
    }

    return { total: convos.length, updated };
  },
});

export const bulkDelete = mutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Verify ownership + cascade delete
    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }

      // 1. Delete bookmarks
      const bookmarks = await ctx.db
        .query("bookmarks")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
        .collect();
      for (const bookmark of bookmarks) {
        await ctx.db.delete(bookmark._id);
      }

      // 2. Delete shares
      const shares = await ctx.db
        .query("shares")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
        .collect();
      for (const share of shares) {
        await ctx.db.delete(share._id);
      }

      // 3. Nullify files conversationId (files can exist independently)
      const files = await ctx.db
        .query("files")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
        .collect();
      for (const file of files) {
        await ctx.db.patch(file._id, { conversationId: undefined });
      }

      // 4. Nullify memories conversationId (memories can exist independently)
      const memories = await ctx.db
        .query("memories")
        .filter((q) => q.eq(q.field("conversationId"), convId))
        .collect();
      for (const memory of memories) {
        await ctx.db.patch(memory._id, { conversationId: undefined });
      }

      // 5. Remove from projects conversationIds arrays
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      for (const project of projects) {
        if (project.conversationIds.includes(convId)) {
          await ctx.db.patch(project._id, {
            conversationIds: project.conversationIds.filter(
              (id) => id !== convId,
            ),
          });
        }
      }

      // 6. Delete messages
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      // 7. Delete conversation
      await ctx.db.delete(convId);
    }

    return { deletedCount: args.conversationIds.length };
  },
});

export const bulkArchive = mutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }

      await ctx.db.patch(convId, {
        archived: true,
        updatedAt: Date.now(),
      });
    }

    return { archivedCount: args.conversationIds.length };
  },
});

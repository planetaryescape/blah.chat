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
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const convos = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();

    // Get message counts for each conversation
    const convosWithCounts = await Promise.all(
      convos.map(async (conv) => {
        const messageCount = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .collect()
          .then((msgs) => msgs.length);

        return { ...conv, messageCount };
      }),
    );

    // Sort: pinned first, then by lastMessageAt
    return convosWithCounts.sort((a, b) => {
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

    // Delete messages first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

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

    // Get message counts for each
    const conversationsWithCounts = await Promise.all(
      conversations.map(async (conv) => {
        const messageCount = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .collect()
          .then((msgs) => msgs.length);
        return { ...conv, messageCount };
      }),
    );

    // Sort by lastMessageAt (most recent first)
    const sorted = conversationsWithCounts.sort(
      (a, b) => b.lastMessageAt - a.lastMessageAt,
    );

    // Find empty conversations (excluding the most recent one)
    const emptyConversations = sorted.filter((c) => c.messageCount === 0);
    const toDelete = emptyConversations.slice(1); // Keep first (most recent), delete rest

    // Delete empty conversations
    let deletedCount = 0;
    for (const conv of toDelete) {
      await ctx.db.delete(conv._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

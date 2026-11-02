import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { logger } from "../lib/logger";

// ===== Internal Queries =====

export const getInternal = internalQuery({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ===== Internal Mutations =====

export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    model: v.string(),
    title: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    parentConversationId: v.optional(v.id("conversations")),
    parentMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const conversationId = await ctx.db.insert("conversations", {
      userId: args.userId,
      title: args.title || "New Chat",
      model: args.model,
      systemPrompt: args.systemPrompt,
      pinned: false,
      archived: false,
      starred: false,
      messageCount: 0,
      lastMessageAt: Date.now(),
      parentConversationId: args.parentConversationId,
      parentMessageId: args.parentMessageId,
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

export const updateMemoryCache = internalMutation({
  args: {
    id: v.id("conversations"),
    cachedMemoryIds: v.array(v.id("memories")),
    lastMemoryFetchAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      cachedMemoryIds: args.cachedMemoryIds,
      lastMemoryFetchAt: args.lastMemoryFetchAt,
    });
  },
});

export const clearMemoryCache = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      cachedMemoryIds: undefined,
      lastMemoryFetchAt: undefined,
    });
    logger.info("Cleared memory cache for conversation", {
      tag: "Cache",
      conversationId: args.conversationId,
    });
  },
});

export const updateExtractionCursor = internalMutation({
  args: {
    id: v.id("conversations"),
    lastExtractedMessageId: v.id("messages"),
    lastMemoryExtractionAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      lastExtractedMessageId: args.lastExtractedMessageId,
      lastMemoryExtractionAt: args.lastMemoryExtractionAt,
    });
  },
});

export const backfillMessageCounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const convos = await ctx.db.query("conversations").collect();
    let updated = 0;

    for (const conv of convos) {
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

export const setModelRecommendation = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    recommendation: v.object({
      suggestedModelId: v.string(),
      currentModelId: v.string(),
      reasoning: v.string(),
      estimatedSavings: v.object({
        costReduction: v.string(),
        percentSaved: v.number(),
      }),
      createdAt: v.number(),
      dismissed: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      modelRecommendation: args.recommendation,
    });
  },
});

export const setModeInternal = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    mode: v.union(v.literal("document"), v.literal("normal")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      mode: args.mode,
      modeActivatedAt: args.mode === "document" ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
  },
});

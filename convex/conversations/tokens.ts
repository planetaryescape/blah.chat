import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
import { getCurrentUser } from "../lib/userSync";

// ===== Public Queries =====

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

export const getConversationTokensByModel = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    const records = await ctx.db
      .query("conversationTokenUsage")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    return records.map((r) => ({
      model: r.model,
      totalTokens: r.totalTokens,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      reasoningTokens: r.reasoningTokens,
      messageCount: r.messageCount,
      lastUpdatedAt: r.lastUpdatedAt,
    }));
  },
});

export const getTotalConversationTokens = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    const records = await ctx.db
      .query("conversationTokenUsage")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    return records.reduce((sum, r) => sum + r.totalTokens, 0);
  },
});

// ===== Internal Mutations =====

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

export const updateConversationTokenUsage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    reasoningTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversationTokenUsage")
      .withIndex("by_conversation_model", (q) =>
        q.eq("conversationId", args.conversationId).eq("model", args.model),
      )
      .first();

    const now = Date.now();
    const totalTokens =
      args.inputTokens + args.outputTokens + (args.reasoningTokens || 0);

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalTokens: existing.totalTokens + totalTokens,
        inputTokens: existing.inputTokens + args.inputTokens,
        outputTokens: existing.outputTokens + args.outputTokens,
        reasoningTokens: existing.reasoningTokens
          ? existing.reasoningTokens + (args.reasoningTokens || 0)
          : args.reasoningTokens || 0,
        messageCount: existing.messageCount + 1,
        lastUpdatedAt: now,
      });
    } else {
      await ctx.db.insert("conversationTokenUsage", {
        conversationId: args.conversationId,
        model: args.model,
        totalTokens,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        reasoningTokens: args.reasoningTokens,
        messageCount: 1,
        lastUpdatedAt: now,
        createdAt: now,
      });
    }

    // DUAL WRITE: Update legacy tokenUsage object
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation) {
      const oldUsage = conversation.tokenUsage || {
        systemTokens: 0,
        messagesTokens: 0,
        memoriesTokens: 0,
        totalTokens: 0,
        contextLimit: 0,
        lastCalculatedAt: Date.now(),
      };

      await ctx.db.patch(args.conversationId, {
        tokenUsage: {
          ...oldUsage,
          messagesTokens: oldUsage.messagesTokens + totalTokens,
          totalTokens: oldUsage.totalTokens + totalTokens,
          lastCalculatedAt: now,
        },
      });
    }
  },
});

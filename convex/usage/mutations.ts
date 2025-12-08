import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const recordTranscription = internalMutation({
  args: {
    userId: v.id("users"),
    model: v.string(),
    durationMinutes: v.number(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().split("T")[0];

    await ctx.db.insert("usageRecords", {
      userId: args.userId,
      date,
      model: args.model,
      inputTokens: 0,
      outputTokens: 0,
      cost: args.cost,
      messageCount: 1,
    });
  },
});

export const recordImageGeneration = internalMutation({
  args: {
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    model: v.string(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().split("T")[0];

    await ctx.db.insert("usageRecords", {
      userId: args.userId,
      date,
      model: args.model,
      inputTokens: 0,
      outputTokens: 0,
      cost: args.cost,
      messageCount: 1,
    });
  },
});

export const recordTextGeneration = internalMutation({
  args: {
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    reasoningTokens: v.optional(v.number()),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().split("T")[0];

    // Upsert: aggregate daily per user+date+model
    const existing = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date_model", (q) =>
        q.eq("userId", args.userId).eq("date", date).eq("model", args.model),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        inputTokens: existing.inputTokens + args.inputTokens,
        outputTokens: existing.outputTokens + args.outputTokens,
        reasoningTokens:
          (existing.reasoningTokens || 0) + (args.reasoningTokens || 0),
        cost: existing.cost + args.cost,
        messageCount: existing.messageCount + 1,
      });
    } else {
      await ctx.db.insert("usageRecords", {
        userId: args.userId,
        date,
        model: args.model,
        conversationId: args.conversationId,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        reasoningTokens: args.reasoningTokens,
        cost: args.cost,
        messageCount: 1,
      });
    }
  },
});

export const recordTTS = internalMutation({
  args: {
    userId: v.id("users"),
    model: v.string(), // e.g., "deepgram:tts"
    characterCount: v.number(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().split("T")[0];

    await ctx.db.insert("usageRecords", {
      userId: args.userId,
      date,
      model: args.model,
      inputTokens: 0,
      outputTokens: args.characterCount, // Track chars as "output tokens"
      cost: args.cost,
      messageCount: 1,
    });
  },
});

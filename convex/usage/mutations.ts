import { v } from "convex/values";
import { internal } from "../_generated/api";
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

export const recordSlideImageGeneration = internalMutation({
  args: {
    userId: v.id("users"),
    presentationId: v.id("presentations"),
    model: v.string(),
    cost: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().split("T")[0];

    await ctx.db.insert("usageRecords", {
      userId: args.userId,
      date,
      model: args.model,
      inputTokens: args.inputTokens ?? 0,
      outputTokens: args.outputTokens ?? 0,
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

    // After upsert, check if budget thresholds crossed
    const adminSettings = await ctx.db.query("adminSettings").first();
    const monthlyBudget = adminSettings?.defaultMonthlyBudget ?? 10;
    const alertThreshold = adminSettings?.defaultBudgetAlertThreshold ?? 0.8;

    if (monthlyBudget > 0) {
      // Get all records for current month
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const monthRecords = await ctx.db
        .query("usageRecords")
        .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
        .filter((q) => q.gte(q.field("date"), monthStart))
        .collect();

      const totalSpent = monthRecords.reduce((sum, r) => sum + r.cost, 0);
      const percentUsed = totalSpent / monthlyBudget;

      // Trigger emails if thresholds crossed
      if (percentUsed >= 1.0) {
        // Budget exceeded (100%)
        await ctx.scheduler.runAfter(
          0,
          internal.emails.utils.send.sendBudgetAlert,
          {
            percentUsed: percentUsed * 100,
            spent: totalSpent,
            budget: monthlyBudget,
            isExceeded: true,
          },
        );
      } else if (percentUsed >= alertThreshold) {
        // Warning threshold (80%)
        await ctx.scheduler.runAfter(
          0,
          internal.emails.utils.send.sendBudgetAlert,
          {
            percentUsed: percentUsed * 100,
            spent: totalSpent,
            budget: monthlyBudget,
            isExceeded: false,
          },
        );
      }
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

export const recordVideoAnalysis = internalMutation({
  args: {
    userId: v.id("users"),
    model: v.string(), // e.g., "google:gemini-2.0-flash-exp"
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

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";

const featureValidator = v.union(
  v.literal("chat"),
  v.literal("notes"),
  v.literal("tasks"),
  v.literal("files"),
  v.literal("memory"),
  v.literal("smart_assistant"),
);

const _operationTypeValidator = v.union(
  v.literal("text"),
  v.literal("tts"),
  v.literal("stt"),
  v.literal("image"),
);

export const recordTranscription = internalMutation({
  args: {
    userId: v.id("users"),
    model: v.string(),
    durationMinutes: v.number(),
    cost: v.number(),
    conversationId: v.optional(v.id("conversations")),
    feature: v.optional(featureValidator),
    isByok: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().split("T")[0];

    await ctx.db.insert("usageRecords", {
      userId: args.userId,
      date,
      model: args.model,
      conversationId: args.conversationId,
      feature: args.feature ?? "chat",
      operationType: "stt",
      inputTokens: 0,
      outputTokens: 0,
      cost: args.cost,
      messageCount: 1,
      isByok: args.isByok,
    });
  },
});

export const recordImageGeneration = internalMutation({
  args: {
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    model: v.string(),
    cost: v.number(),
    feature: v.optional(featureValidator),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().split("T")[0];

    await ctx.db.insert("usageRecords", {
      userId: args.userId,
      date,
      model: args.model,
      conversationId: args.conversationId,
      feature: args.feature ?? "chat",
      operationType: "image",
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
    conversationId: v.optional(v.id("conversations")),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    reasoningTokens: v.optional(v.number()),
    cost: v.number(),
    feature: v.optional(featureValidator),
    isByok: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().split("T")[0];
    const feature = args.feature ?? "chat";

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
        feature,
        operationType: "text",
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        reasoningTokens: args.reasoningTokens,
        cost: args.cost,
        messageCount: 1,
        isByok: args.isByok,
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
          // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
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
          // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
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
    conversationId: v.optional(v.id("conversations")),
    feature: v.optional(featureValidator),
    isByok: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().split("T")[0];

    await ctx.db.insert("usageRecords", {
      userId: args.userId,
      date,
      model: args.model,
      conversationId: args.conversationId,
      feature: args.feature ?? "chat",
      operationType: "tts",
      inputTokens: 0,
      outputTokens: args.characterCount, // Track chars as "output tokens"
      cost: args.cost,
      messageCount: 1,
      isByok: args.isByok,
    });
  },
});

export const recordEmbedding = internalMutation({
  args: {
    userId: v.id("users"),
    model: v.string(),
    tokenCount: v.number(),
    cost: v.number(),
    feature: v.optional(featureValidator),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().split("T")[0];

    await ctx.db.insert("usageRecords", {
      userId: args.userId,
      date,
      model: args.model,
      feature: args.feature ?? "chat",
      operationType: "embedding",
      inputTokens: args.tokenCount,
      outputTokens: 0,
      cost: args.cost,
      messageCount: 1,
    });
  },
});

// Track user action button clicks
export const recordAction = mutation({
  args: {
    actionType: v.string(), // copy_message, bookmark_message, save_as_note, etc.
    resourceId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.insert("activityEvents", {
      userId: user._id,
      eventType: args.actionType,
      resourceId: args.resourceId,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

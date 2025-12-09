import { v } from "convex/values";
import { query } from "../_generated/server";

export const getDailySpend = query({
  args: {
    days: v.optional(v.number()), // default 30
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const daysToFetch = args.days || 30;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToFetch);

    const startDateStr = startDate.toISOString().split("T")[0];

    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("date"), startDateStr))
      .collect();

    // Group by date
    const dailyTotals = records.reduce(
      (acc, record) => {
        const date = record.date;
        if (!acc[date]) {
          acc[date] = { date, cost: 0, tokens: 0 };
        }
        acc[date].cost += record.cost;
        acc[date].tokens += record.inputTokens + record.outputTokens;
        return acc;
      },
      {} as Record<string, { date: string; cost: number; tokens: number }>,
    );

    return Object.values(dailyTotals).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  },
});

export const getSpendByModel = query({
  args: {
    days: v.optional(v.number()), // default 30
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const daysToFetch = args.days || 30;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToFetch);

    const startDateStr = startDate.toISOString().split("T")[0];

    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("date"), startDateStr))
      .collect();

    // Group by model
    const modelTotals = records.reduce(
      (acc, record) => {
        const model = record.model;
        if (!acc[model]) {
          acc[model] = { model, cost: 0, tokens: 0, requests: 0 };
        }
        acc[model].cost += record.cost;
        acc[model].tokens += record.inputTokens + record.outputTokens;
        acc[model].requests += 1;
        return acc;
      },
      {} as Record<
        string,
        { model: string; cost: number; tokens: number; requests: number }
      >,
    );

    return Object.values(modelTotals).sort((a, b) => b.cost - a.cost);
  },
});

export const getMonthlyTotal = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("date"), monthStart))
      .collect();

    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = records.reduce(
      (sum, r) => sum + r.inputTokens + r.outputTokens,
      0,
    );
    const totalRequests = records.length;

    // Get budget from admin settings
    const adminSettings = await ctx.db.query("adminSettings").first();
    const monthlyBudget = adminSettings?.defaultMonthlyBudget ?? 0;

    return {
      cost: totalCost,
      tokens: totalTokens,
      requests: totalRequests,
      budget: monthlyBudget,
      percentUsed: monthlyBudget ? (totalCost / monthlyBudget) * 100 : 0,
    };
  },
});

export const getConversationCosts = query({
  args: {
    limit: v.optional(v.number()), // default 10
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit || 10);

    // Calculate costs per conversation from usageRecords
    return Promise.all(
      conversations.map(async (conv) => {
        const records = await ctx.db
          .query("usageRecords")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .collect();

        const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
        const totalTokens = records.reduce(
          (sum, r) => sum + r.inputTokens + r.outputTokens,
          0,
        );

        return {
          conversationId: conv._id,
          title: conv.title,
          cost: totalCost,
          tokens: totalTokens,
        };
      }),
    );
  },
});

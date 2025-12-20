import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
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

// ============================================
// ADMIN QUERIES (Per-User Analytics)
// ============================================

// Helper to check admin access
async function requireAdmin(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();

  if (!user || !user.isAdmin) {
    throw new Error("Admin access required");
  }

  return user;
}

export const getUserDailySpend = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate),
        ),
      )
      .collect();

    // Group by date
    const dailyTotals = records.reduce(
      (acc, record) => {
        const date = record.date;
        if (!acc[date]) {
          acc[date] = { date, totalCost: 0, totalTokens: 0, requestCount: 0 };
        }
        acc[date].totalCost += record.cost;
        acc[date].totalTokens += record.inputTokens + record.outputTokens;
        acc[date].requestCount += 1;
        return acc;
      },
      {} as Record<
        string,
        {
          date: string;
          totalCost: number;
          totalTokens: number;
          requestCount: number;
        }
      >,
    );

    return Object.values(dailyTotals).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  },
});

export const getUserSpendByModel = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate),
        ),
      )
      .collect();

    // Group by model
    const modelTotals = records.reduce(
      (acc, record) => {
        const model = record.model;
        if (!acc[model]) {
          acc[model] = {
            model,
            totalCost: 0,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            requestCount: 0,
          };
        }
        acc[model].totalCost += record.cost;
        acc[model].totalInputTokens += record.inputTokens;
        acc[model].totalOutputTokens += record.outputTokens;
        acc[model].requestCount += 1;
        return acc;
      },
      {} as Record<
        string,
        {
          model: string;
          totalCost: number;
          totalInputTokens: number;
          totalOutputTokens: number;
          requestCount: number;
        }
      >,
    );

    return Object.values(modelTotals).sort((a, b) => b.totalCost - a.totalCost);
  },
});

export const getUserMonthlyTotal = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
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

export const getUserUsageSummary = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate),
        ),
      )
      .collect();

    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = records.reduce(
      (sum, r) => sum + r.inputTokens + r.outputTokens,
      0,
    );
    const totalRequests = records.length;

    // Sum up message counts from usage records instead of scanning all messages
    const messageCount = records.reduce(
      (sum, r) => sum + (r.messageCount || 0),
      0,
    );

    return {
      totalCost,
      totalTokens,
      totalRequests,
      avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      messageCount,
    };
  },
});

export const getAllUsersUsageSummary = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const records = await ctx.db
      .query("usageRecords")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate),
        ),
      )
      .collect();

    // Group by userId
    const userTotals = records.reduce(
      (acc, record) => {
        const userId = record.userId;
        if (!acc[userId]) {
          acc[userId] = {
            userId,
            totalCost: 0,
            totalTokens: 0,
            totalRequests: 0,
          };
        }
        acc[userId].totalCost += record.cost;
        acc[userId].totalTokens += record.inputTokens + record.outputTokens;
        acc[userId].totalRequests += 1;
        return acc;
      },
      {} as Record<
        string,
        {
          userId: Id<"users">;
          totalCost: number;
          totalTokens: number;
          totalRequests: number;
        }
      >,
    );

    return Object.values(userTotals);
  },
});

export const getUserCostByType = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate),
        ),
      )
      .collect();

    // Categorize by type based on model name patterns
    // Text generation: most LLM models
    // STT: whisper models
    // TTS: tts models
    // Images: dall-e models, chat image generation
    // Slides: gemini image models for slide generation
    const textGeneration = { cost: 0, tokens: 0 };
    const tts = { cost: 0, characters: 0 };
    const images = { cost: 0, count: 0 };
    const slides = { cost: 0, count: 0 };
    const transcription = { cost: 0 };

    for (const record of records) {
      const modelLower = record.model.toLowerCase();

      if (modelLower.includes("whisper")) {
        transcription.cost += record.cost;
      } else if (modelLower.includes("tts")) {
        tts.cost += record.cost;
        tts.characters += record.outputTokens; // Character count stored as outputTokens for TTS
      } else if (
        modelLower.includes("dall-e") ||
        modelLower.includes("dalle")
      ) {
        images.cost += record.cost;
        images.count += 1;
      } else if (
        modelLower.includes("image") &&
        (modelLower.includes("gemini") || modelLower.includes("google"))
      ) {
        // Gemini image generation models (used for slides and chat images)
        slides.cost += record.cost;
        slides.count += 1;
      } else {
        // Default to text generation
        textGeneration.cost += record.cost;
        textGeneration.tokens += record.inputTokens + record.outputTokens;
      }
    }

    return {
      textGeneration,
      tts,
      images,
      slides,
      transcription,
    };
  },
});

export const getUserActivityStats = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const templates = await ctx.db
      .query("scheduledPrompts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const presentations = await ctx.db
      .query("presentations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      notesCount: notes.length,
      projectsCount: projects.length,
      bookmarksCount: bookmarks.length,
      templatesCount: templates.length,
      slidesCount: presentations.length,
      tasksCount: tasks.length,
    };
  },
});

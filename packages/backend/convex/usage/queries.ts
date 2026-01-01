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
// USER QUERIES (Extended Analytics)
// ============================================

// Helper to get current user
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) throw new Error("User not found");
  return user;
}

export const getUsageSummary = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    isByok: v.optional(v.boolean()), // Filter by BYOK status
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    let records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate),
        ),
      )
      .collect();

    // Filter by BYOK status if specified
    if (args.isByok !== undefined) {
      records = records.filter((r) => (r.isByok ?? false) === args.isByok);
    }

    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalInputTokens = records.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = records.reduce(
      (sum, r) => sum + r.outputTokens,
      0,
    );
    const totalTokens = totalInputTokens + totalOutputTokens;
    const totalRequests = records.length;
    const messageCount = records.reduce(
      (sum, r) => sum + (r.messageCount || 0),
      0,
    );

    return {
      totalCost,
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      totalRequests,
      avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      messageCount,
    };
  },
});

// BYOK breakdown: platform vs user keys usage
export const getByokBreakdown = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate),
        ),
      )
      .collect();

    const platform = { cost: 0, tokens: 0, requests: 0 };
    const byok = { cost: 0, tokens: 0, requests: 0 };

    for (const record of records) {
      const target = record.isByok ? byok : platform;
      target.cost += record.cost;
      target.tokens += record.inputTokens + record.outputTokens;
      target.requests += 1;
    }

    return { platform, byok };
  },
});

export const getCostByType = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate),
        ),
      )
      .collect();

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
        tts.characters += record.outputTokens;
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
        slides.cost += record.cost;
        slides.count += 1;
      } else {
        textGeneration.cost += record.cost;
        textGeneration.tokens += record.inputTokens + record.outputTokens;
      }
    }

    return { textGeneration, tts, images, slides, transcription };
  },
});

// Feature type for grouping
type FeatureType =
  | "chat"
  | "slides"
  | "notes"
  | "tasks"
  | "files"
  | "memory"
  | "smart_assistant";
type OperationType = "text" | "tts" | "stt" | "image";

// Helper to derive feature from legacy records (no feature field)
function deriveFeatureFromModel(model: string): {
  feature: FeatureType;
  operationType: OperationType;
} {
  const modelLower = model.toLowerCase();

  if (modelLower.includes("whisper")) {
    return { feature: "chat", operationType: "stt" };
  }
  if (modelLower.includes("tts")) {
    return { feature: "chat", operationType: "tts" };
  }
  if (modelLower.includes("dall-e") || modelLower.includes("dalle")) {
    return { feature: "chat", operationType: "image" };
  }
  if (
    modelLower.includes("image") &&
    (modelLower.includes("gemini") || modelLower.includes("google"))
  ) {
    return { feature: "slides", operationType: "image" };
  }
  return { feature: "chat", operationType: "text" };
}

// Structure for feature breakdown with sub-breakdown by operation type
interface FeatureBreakdown {
  total: number;
  text: number;
  tts: number;
  stt: number;
  image: number;
  tokens: number;
  requests: number;
}

function createEmptyFeatureBreakdown(): FeatureBreakdown {
  return {
    total: 0,
    text: 0,
    tts: 0,
    stt: 0,
    image: 0,
    tokens: 0,
    requests: 0,
  };
}

export const getCostByFeature = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate),
        ),
      )
      .collect();

    const breakdown: Record<FeatureType, FeatureBreakdown> = {
      chat: createEmptyFeatureBreakdown(),
      slides: createEmptyFeatureBreakdown(),
      notes: createEmptyFeatureBreakdown(),
      tasks: createEmptyFeatureBreakdown(),
      files: createEmptyFeatureBreakdown(),
      memory: createEmptyFeatureBreakdown(),
      smart_assistant: createEmptyFeatureBreakdown(),
    };

    for (const record of records) {
      // Use explicit feature/operationType if available, otherwise derive from model
      let feature: FeatureType;
      let opType: OperationType;

      if (record.feature && record.operationType) {
        feature = record.feature as FeatureType;
        opType = record.operationType as OperationType;
      } else {
        const derived = deriveFeatureFromModel(record.model);
        feature = derived.feature;
        opType = derived.operationType;
      }

      const target = breakdown[feature];
      target.total += record.cost;
      target[opType] += record.cost;
      target.tokens += record.inputTokens + record.outputTokens;
      target.requests += 1;
    }

    return breakdown;
  },
});

export const getActivityStats = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const [notes, projects, bookmarks, templates, presentations, tasks] =
      await Promise.all([
        ctx.db
          .query("notes")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("projects")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("bookmarks")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("scheduledPrompts")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("presentations")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect(),
        ctx.db
          .query("tasks")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect(),
      ]);

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

export const getTotalCounts = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const [conversations, files] = await Promise.all([
      ctx.db
        .query("conversations")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("files")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
    ]);

    // Count images from usageRecords (dall-e usage)
    const usageRecords = await ctx.db
      .query("usageRecords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const imagesGenerated = usageRecords.filter((r) => {
      const modelLower = r.model.toLowerCase();
      return modelLower.includes("dall-e") || modelLower.includes("dalle");
    }).length;

    return {
      conversationsCount: conversations.length,
      filesCount: files.length,
      imagesGenerated,
    };
  },
});

export const getStreakStats = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    // Get all usage dates for user
    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Extract unique dates and sort them
    const uniqueDates = [...new Set(records.map((r) => r.date))].sort();

    if (uniqueDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    // Check if user has activity today or yesterday for current streak
    const lastActivityDate = uniqueDates[uniqueDates.length - 1];
    const isActive =
      lastActivityDate === today || lastActivityDate === yesterday;

    // Calculate longest streak and current streak
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffDays = Math.round(
        (currDate.getTime() - prevDate.getTime()) / 86400000,
      );

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate current streak (counting backwards from last activity)
    if (isActive) {
      currentStreak = 1;
      for (let i = uniqueDates.length - 2; i >= 0; i--) {
        const currDate = new Date(uniqueDates[i + 1]);
        const prevDate = new Date(uniqueDates[i]);
        const diffDays = Math.round(
          (currDate.getTime() - prevDate.getTime()) / 86400000,
        );

        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    return { currentStreak, longestStreak };
  },
});

export const getActivityHeatmap = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    // Use usageRecords (already aggregated daily) instead of scanning all messages
    // This avoids the "Too many bytes read" error for heavy users
    // Max 365 * 50 models = 18250 records worst case, but typically much less
    const oneYearAgoStr = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const usageRecords = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("date"), oneYearAgoStr))
      .take(20000); // Safety limit

    // Build heatmap from usage records (sum messageCount per date)
    const heatmap: Record<string, number> = {};

    for (const record of usageRecords) {
      heatmap[record.date] =
        (heatmap[record.date] || 0) + (record.messageCount || 0);
    }

    // Convert to array format for 52 weeks
    const result: { date: string; count: number }[] = [];
    const today = new Date();

    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      result.push({
        date: dateStr,
        count: heatmap[dateStr] || 0,
      });
    }

    return result;
  },
});

export const getPercentileRanking = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    // Get latest ranking for user
    const ranking = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (!ranking) {
      return null;
    }

    return {
      overallPercentile: ranking.overallPercentile,
      modelRankings: ranking.modelRankings,
      totalActiveUsers: ranking.totalActiveUsers,
      calculatedAt: ranking.date,
    };
  },
});

export const getActionStats = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Count by eventType
    const actionCounts: Record<string, number> = {
      copy_message: 0,
      bookmark_message: 0,
      save_as_note: 0,
      create_presentation: 0,
      branch_message: 0,
      regenerate_message: 0,
    };

    for (const event of events) {
      if (event.eventType in actionCounts) {
        actionCounts[event.eventType]++;
      }
    }

    return actionCounts;
  },
});

export const getSpendByModelDetailed = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate),
        ),
      )
      .collect();

    // Group by model with detailed token breakdown
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

export const getUserCostByFeature = query({
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

    const breakdown: Record<FeatureType, FeatureBreakdown> = {
      chat: createEmptyFeatureBreakdown(),
      slides: createEmptyFeatureBreakdown(),
      notes: createEmptyFeatureBreakdown(),
      tasks: createEmptyFeatureBreakdown(),
      files: createEmptyFeatureBreakdown(),
      memory: createEmptyFeatureBreakdown(),
      smart_assistant: createEmptyFeatureBreakdown(),
    };

    for (const record of records) {
      let feature: FeatureType;
      let opType: OperationType;

      if (record.feature && record.operationType) {
        feature = record.feature as FeatureType;
        opType = record.operationType as OperationType;
      } else {
        const derived = deriveFeatureFromModel(record.model);
        feature = derived.feature;
        opType = derived.operationType;
      }

      const target = breakdown[feature];
      target.total += record.cost;
      target[opType] += record.cost;
      target.tokens += record.inputTokens + record.outputTokens;
      target.requests += 1;
    }

    return breakdown;
  },
});

export const getAllUsersCostByFeature = query({
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

    const breakdown: Record<FeatureType, FeatureBreakdown> = {
      chat: createEmptyFeatureBreakdown(),
      slides: createEmptyFeatureBreakdown(),
      notes: createEmptyFeatureBreakdown(),
      tasks: createEmptyFeatureBreakdown(),
      files: createEmptyFeatureBreakdown(),
      memory: createEmptyFeatureBreakdown(),
      smart_assistant: createEmptyFeatureBreakdown(),
    };

    for (const record of records) {
      let feature: FeatureType;
      let opType: OperationType;

      if (record.feature && record.operationType) {
        feature = record.feature as FeatureType;
        opType = record.operationType as OperationType;
      } else {
        const derived = deriveFeatureFromModel(record.model);
        feature = derived.feature;
        opType = derived.operationType;
      }

      const target = breakdown[feature];
      target.total += record.cost;
      target[opType] += record.cost;
      target.tokens += record.inputTokens + record.outputTokens;
      target.requests += 1;
    }

    return breakdown;
  },
});

// Admin query: Monthly total across ALL users
export const getAllUsersMonthlyTotal = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const records = await ctx.db
      .query("usageRecords")
      .filter((q) => q.gte(q.field("date"), monthStart))
      .collect();

    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = records.reduce(
      (sum, r) => sum + r.inputTokens + r.outputTokens,
      0,
    );
    const totalRequests = records.length;

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

// Admin query: Daily spend across ALL users
export const getAllUsersDailySpend = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const daysToFetch = args.days || 30;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToFetch);
    const startDateStr = startDate.toISOString().split("T")[0];

    const records = await ctx.db
      .query("usageRecords")
      .filter((q) => q.gte(q.field("date"), startDateStr))
      .collect();

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

// Admin query: Spend by model across ALL users
export const getAllUsersSpendByModel = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const daysToFetch = args.days || 30;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToFetch);
    const startDateStr = startDate.toISOString().split("T")[0];

    const records = await ctx.db
      .query("usageRecords")
      .filter((q) => q.gte(q.field("date"), startDateStr))
      .collect();

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

// Admin query: Top conversations by cost across ALL users
export const getAllUsersConversationCosts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Get all usage records with conversationId
    const records = await ctx.db
      .query("usageRecords")
      .filter((q) => q.neq(q.field("conversationId"), undefined))
      .collect();

    // Group by conversationId
    const conversationCosts = records.reduce(
      (acc, record) => {
        if (!record.conversationId) return acc;
        const convId = record.conversationId;
        if (!acc[convId]) {
          acc[convId] = { conversationId: convId, cost: 0, tokens: 0 };
        }
        acc[convId].cost += record.cost;
        acc[convId].tokens += record.inputTokens + record.outputTokens;
        return acc;
      },
      {} as Record<
        string,
        { conversationId: Id<"conversations">; cost: number; tokens: number }
      >,
    );

    // Sort by cost and take top N
    const sorted = Object.values(conversationCosts)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, args.limit || 10);

    // Fetch conversation titles
    return Promise.all(
      sorted.map(async (item) => {
        const conv = await ctx.db.get(item.conversationId);
        return {
          conversationId: item.conversationId,
          title: conv?.title || "Untitled",
          cost: item.cost,
          tokens: item.tokens,
        };
      }),
    );
  },
});

// ============================================
// PRESENTATION STATS QUERIES
// ============================================

export const getPresentationStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Count presentations
    const presentations = await ctx.db
      .query("presentations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Count total slides
    const slides = await ctx.db
      .query("slides")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get usage records for slides feature
    let usageRecords = await ctx.db
      .query("usageRecords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("feature"), "slides"))
      .collect();

    // Apply date filter if provided
    if (args.startDate && args.endDate) {
      usageRecords = usageRecords.filter(
        (r) => r.date >= args.startDate! && r.date <= args.endDate!,
      );
    }

    // Separate outline vs image costs
    let outlineCost = 0;
    let imageCost = 0;
    let outlineRequests = 0;
    let imageRequests = 0;

    for (const record of usageRecords) {
      if (record.operationType === "image") {
        imageCost += record.cost;
        imageRequests += 1;
      } else {
        outlineCost += record.cost;
        outlineRequests += 1;
      }
    }

    return {
      presentationsCount: presentations.length,
      slidesCount: slides.length,
      outlineCost,
      imageCost,
      totalCost: outlineCost + imageCost,
      outlineRequests,
      imageRequests,
    };
  },
});

export const getAllUsersPresentationStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Count all presentations
    const presentations = await ctx.db.query("presentations").collect();

    // Count all slides
    const slides = await ctx.db.query("slides").collect();

    // Get all usage records for slides feature
    let usageRecords = await ctx.db
      .query("usageRecords")
      .filter((q) => q.eq(q.field("feature"), "slides"))
      .collect();

    // Apply date filter if provided
    if (args.startDate && args.endDate) {
      usageRecords = usageRecords.filter(
        (r) => r.date >= args.startDate! && r.date <= args.endDate!,
      );
    }

    // Separate outline vs image costs
    let outlineCost = 0;
    let imageCost = 0;
    let outlineRequests = 0;
    let imageRequests = 0;

    for (const record of usageRecords) {
      if (record.operationType === "image") {
        imageCost += record.cost;
        imageRequests += 1;
      } else {
        outlineCost += record.cost;
        outlineRequests += 1;
      }
    }

    return {
      presentationsCount: presentations.length,
      slidesCount: slides.length,
      outlineCost,
      imageCost,
      totalCost: outlineCost + imageCost,
      outlineRequests,
      imageRequests,
    };
  },
});

export const getUserPresentationStats = query({
  args: {
    userId: v.id("users"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Count user's presentations
    const presentations = await ctx.db
      .query("presentations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Count user's slides
    const slides = await ctx.db
      .query("slides")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get usage records for slides feature
    let usageRecords = await ctx.db
      .query("usageRecords")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("feature"), "slides"))
      .collect();

    // Apply date filter if provided
    if (args.startDate && args.endDate) {
      usageRecords = usageRecords.filter(
        (r) => r.date >= args.startDate! && r.date <= args.endDate!,
      );
    }

    // Separate outline vs image costs
    let outlineCost = 0;
    let imageCost = 0;
    let outlineRequests = 0;
    let imageRequests = 0;

    for (const record of usageRecords) {
      if (record.operationType === "image") {
        imageCost += record.cost;
        imageRequests += 1;
      } else {
        outlineCost += record.cost;
        outlineRequests += 1;
      }
    }

    return {
      presentationsCount: presentations.length,
      slidesCount: slides.length,
      outlineCost,
      imageCost,
      totalCost: outlineCost + imageCost,
      outlineRequests,
      imageRequests,
    };
  },
});

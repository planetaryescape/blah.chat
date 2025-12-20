import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";

/**
 * Get global admin settings
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user to check admin status
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Return settings or defaults
    const settings = await ctx.db.query("adminSettings").first();
    return (
      settings || {
        autoMemoryExtractEnabled: true,
        autoMemoryExtractInterval: 5,
        enableHybridSearch: false,
        defaultMonthlyBudget: 10,
        defaultBudgetAlertThreshold: 0.8,
        budgetHardLimitEnabled: true,
        defaultDailyMessageLimit: 50,
        defaultDailyPresentationLimit: 1,
        alertEmail: "blah.chat@bhekani.com",
        transcriptProvider: "groq",
        transcriptCostPerMinute: 0.0067,
      }
    );
  },
});

/**
 * Update global admin settings
 */
export const update = mutation({
  args: {
    autoMemoryExtractEnabled: v.optional(v.boolean()),
    autoMemoryExtractInterval: v.optional(v.number()),
    enableHybridSearch: v.optional(v.boolean()),
    defaultMonthlyBudget: v.optional(v.number()),
    defaultBudgetAlertThreshold: v.optional(v.number()),
    budgetHardLimitEnabled: v.optional(v.boolean()),
    defaultDailyMessageLimit: v.optional(v.number()),
    defaultDailyPresentationLimit: v.optional(v.number()),
    alertEmail: v.optional(v.string()),
    transcriptProvider: v.optional(v.string()),
    transcriptCostPerMinute: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user to check admin status
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Validate transcript provider has corresponding API key
    if (args.transcriptProvider) {
      const keyEnvVar = `${args.transcriptProvider.toUpperCase()}_API_KEY`;
      if (!process.env[keyEnvVar]) {
        const errorMsg =
          process.env.NODE_ENV === "production"
            ? "Cannot set transcript provider: API key not configured"
            : `Cannot set ${args.transcriptProvider} as STT provider: ${keyEnvVar} environment variable is missing`;
        throw new Error(errorMsg);
      }
    }

    const userId = user._id;
    const existing = await ctx.db.query("adminSettings").first();

    if (existing) {
      // Update existing settings
      await ctx.db.patch(existing._id, {
        ...args,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    } else {
      // Create initial settings
      await ctx.db.insert("adminSettings", {
        autoMemoryExtractEnabled: args.autoMemoryExtractEnabled ?? true,
        autoMemoryExtractInterval: args.autoMemoryExtractInterval ?? 5,
        enableHybridSearch: args.enableHybridSearch ?? false,
        defaultMonthlyBudget: args.defaultMonthlyBudget ?? 10,
        defaultBudgetAlertThreshold: args.defaultBudgetAlertThreshold ?? 0.8,
        budgetHardLimitEnabled: args.budgetHardLimitEnabled ?? true,
        defaultDailyMessageLimit: args.defaultDailyMessageLimit ?? 50,
        defaultDailyPresentationLimit: args.defaultDailyPresentationLimit ?? 1,
        alertEmail: args.alertEmail ?? "blah.chat@bhekani.com",
        transcriptProvider: args.transcriptProvider ?? "groq",
        transcriptCostPerMinute: args.transcriptCostPerMinute ?? 0.0067,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Internal query to get admin settings (no auth check)
 * Used by email system and other internal functions
 */
export const getInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("adminSettings").first();
  },
});

/**
 * Get admin settings with environment variable overrides
 * Self-hosted instances can override defaults via env vars
 */
export const getWithEnvOverrides = internalQuery({
  args: {},
  handler: async (ctx) => {
    const dbSettings = await ctx.db.query("adminSettings").first();

    // Default values
    const defaults = {
      autoMemoryExtractEnabled: true,
      autoMemoryExtractInterval: 5,
      enableHybridSearch: false,
      defaultMonthlyBudget: 10,
      defaultBudgetAlertThreshold: 0.8,
      budgetHardLimitEnabled: true,
      defaultDailyMessageLimit: 50,
      defaultDailyPresentationLimit: 1,
      alertEmail: "blah.chat@bhekani.com",
      transcriptProvider: "groq",
      transcriptCostPerMinute: 0.0067,
    };

    // Merge: env vars > database > defaults
    const settings = dbSettings || defaults;

    return {
      ...settings,
      // Environment variable overrides (for self-hosted instances)
      defaultDailyMessageLimit: process.env.DEFAULT_DAILY_MESSAGE_LIMIT
        ? Number.parseInt(process.env.DEFAULT_DAILY_MESSAGE_LIMIT, 10)
        : settings.defaultDailyMessageLimit,
      defaultDailyPresentationLimit: process.env
        .DEFAULT_DAILY_PRESENTATION_LIMIT
        ? Number.parseInt(process.env.DEFAULT_DAILY_PRESENTATION_LIMIT, 10)
        : (settings.defaultDailyPresentationLimit ?? 1),
      defaultMonthlyBudget: process.env.DEFAULT_MONTHLY_BUDGET
        ? Number.parseFloat(process.env.DEFAULT_MONTHLY_BUDGET)
        : settings.defaultMonthlyBudget,
      defaultBudgetAlertThreshold: process.env.BUDGET_ALERT_THRESHOLD
        ? Number.parseFloat(process.env.BUDGET_ALERT_THRESHOLD)
        : settings.defaultBudgetAlertThreshold,
      budgetHardLimitEnabled: process.env.BUDGET_HARD_LIMIT_ENABLED
        ? process.env.BUDGET_HARD_LIMIT_ENABLED === "true"
        : settings.budgetHardLimitEnabled,
      alertEmail: process.env.ALERT_EMAIL || settings.alertEmail,
    };
  },
});

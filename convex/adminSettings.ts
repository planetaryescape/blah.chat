import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

/**
 * Get onboarding state for current user
 * Returns undefined if not authenticated, null if authenticated but not initialized, or onboarding state
 */
export const getOnboardingState = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return undefined; // Not authenticated yet

    const onboarding = await ctx.db
      .query("userOnboarding")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return onboarding || null; // Authenticated but not initialized
  },
});

/**
 * Initialize onboarding state for new user
 */
export const initializeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    // Check auth first to avoid race condition with Clerk initialization
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null; // Not authenticated yet, return early

    const user = await getCurrentUserOrCreate(ctx);
    const now = Date.now();

    // Check if already exists
    const existing = await ctx.db
      .query("userOnboarding")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) return existing._id;

    // Create new onboarding state
    return await ctx.db.insert("userOnboarding", {
      userId: user._id,
      tourCompleted: false,
      tourSkipped: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Get all dismissed hints for current user
 * Returns array of dismissed hint IDs
 */
export const getDismissedHints = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const hints = await ctx.db
      .query("dismissedHints")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return hints;
  },
});

/**
 * Get user stats for progressive hints
 * Returns null if not initialized
 */
export const getUserStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return stats || null;
  },
});

/**
 * Initialize user stats for new user
 */
export const initializeUserStats = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrCreate(ctx);
    const now = Date.now();

    // Check if already exists
    const existing = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) return existing._id;

    // Create with defaults
    return await ctx.db.insert("userStats", {
      userId: user._id,
      totalMessages: 0,
      totalConversations: 0,
      totalSearches: 0,
      totalBookmarks: 0,
      longMessageCount: 0,
      messagesInCurrentConvo: 0,
      consecutiveSearches: 0,
      promptPatternCount: {},
      lastUpdated: now,
    });
  },
});

/**
 * Complete or skip the onboarding tour
 */
export const completeTour = mutation({
  args: {
    skipped: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("userOnboarding")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tourCompleted: !args.skipped,
        tourCompletedAt: args.skipped ? undefined : now,
        tourSkipped: !!args.skipped,
        tourSkippedAt: args.skipped ? now : undefined,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new record
    return await ctx.db.insert("userOnboarding", {
      userId: user._id,
      tourCompleted: !args.skipped,
      tourCompletedAt: args.skipped ? undefined : now,
      tourSkipped: !!args.skipped,
      tourSkippedAt: args.skipped ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Dismiss a progressive hint permanently
 */
export const dismissHint = mutation({
  args: {
    featureId: v.string(),
    viewCount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const now = Date.now();

    // Check if already dismissed
    const existing = await ctx.db
      .query("dismissedHints")
      .withIndex("by_user_feature", (q) =>
        q.eq("userId", user._id).eq("featureId", args.featureId),
      )
      .first();

    if (existing) {
      // Update view count
      await ctx.db.patch(existing._id, {
        viewCount: args.viewCount,
        dismissedAt: now,
      });
      return existing._id;
    }

    // Create new dismissal
    return await ctx.db.insert("dismissedHints", {
      userId: user._id,
      featureId: args.featureId,
      dismissedAt: now,
      viewCount: args.viewCount,
      createdAt: now,
    });
  },
});

/**
 * Reset onboarding tour (for manual restart)
 */
export const resetOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrCreate(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("userOnboarding")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tourCompleted: false,
        tourCompletedAt: undefined,
        tourSkipped: false,
        tourSkippedAt: undefined,
        tourStep: undefined,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new record
    return await ctx.db.insert("userOnboarding", {
      userId: user._id,
      tourCompleted: false,
      tourSkipped: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update user stats for progressive hints
 */
export const updateUserStats = mutation({
  args: {
    field: v.string(),
    increment: v.optional(v.number()),
    set: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const now = Date.now();

    let stats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!stats) {
      // Create with defaults
      const statsId = await ctx.db.insert("userStats", {
        userId: user._id,
        totalMessages: 0,
        totalConversations: 0,
        totalSearches: 0,
        totalBookmarks: 0,
        longMessageCount: 0,
        messagesInCurrentConvo: 0,
        consecutiveSearches: 0,
        promptPatternCount: {},
        lastUpdated: now,
      });
      stats = await ctx.db.get(statsId);
    }

    // Build update object
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic update object for onboarding stats
    const update: any = { lastUpdated: now };

    if (args.increment !== undefined) {
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic property access on stats object
      const currentValue = (stats as any)[args.field] || 0;
      update[args.field] = currentValue + args.increment;
    } else if (args.set !== undefined) {
      update[args.field] = args.set;
    }

    await ctx.db.patch(stats._id, update);
    return stats._id;
  },
});

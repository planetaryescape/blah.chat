/**
 * Phase 4: User Preferences Backfill Migration
 *
 * Migrates existing user preferences from nested object to flat key-value table.
 * Runs in batches to avoid Convex 10-minute action timeout.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { PREFERENCE_CATEGORIES } from "../users/constants";

/**
 * Query: Check backfill progress
 */
export const getBackfillStatus = internalQuery({
  handler: async (ctx) => {
    const totalUsers = await ctx.db.query("users").collect();
    const usersWithPrefs = await ctx.db
      .query("userPreferences")
      .collect()
      .then((prefs) => new Set(prefs.map((p) => p.userId)).size);

    return {
      totalUsers: totalUsers.length,
      usersWithPrefs,
      remaining: totalUsers.length - usersWithPrefs,
      percentage:
        totalUsers.length > 0
          ? ((usersWithPrefs / totalUsers.length) * 100).toFixed(1)
          : "0",
    };
  },
});

/**
 * Query: Get users needing backfill (paginated)
 */
export const getUsersToBackfill = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .paginate({ cursor: args.cursor, numItems: args.batchSize });

    // Filter to only users without backfilled preferences
    const needsBackfill = [];
    for (const user of users.page) {
      const existing = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (!existing) {
        needsBackfill.push(user);
      }
    }

    return {
      users: needsBackfill,
      nextCursor: users.continueCursor,
      isDone: users.isDone,
    };
  },
});

/**
 * Mutation: Backfill preferences for a batch of users
 */
export const backfillBatch = internalMutation({
  args: {
    batchSize: v.number(),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;
    const now = Date.now();

    // Get users without backfilled preferences
    const users = await ctx.db.query("users").take(args.batchSize);

    for (const user of users) {
      // Check if already backfilled
      const existing = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      if (!user.preferences) {
        skipped++;
        continue;
      }

      const prefs = user.preferences;

      // Insert individual preferences (skip undefined/null)
      for (const [key, value] of Object.entries(prefs)) {
        if (value === undefined || value === null) continue;

        // Special handling for nested objects (customInstructions, reasoning)
        if (key === "customInstructions" || key === "reasoning") {
          await ctx.db.insert("userPreferences", {
            userId: user._id,
            category: key as any,
            key,
            value,
            createdAt: now,
            updatedAt: now,
          });
          inserted++;
          continue;
        }

        // Regular preferences
        const category = PREFERENCE_CATEGORIES[key];
        if (category) {
          await ctx.db.insert("userPreferences", {
            userId: user._id,
            category: category as any,
            key,
            value,
            createdAt: now,
            updatedAt: now,
          });
          inserted++;
        }
      }
    }

    return {
      processed: users.length,
      inserted,
      skipped,
    };
  },
});

/**
 * Mutation: Backfill single user (for testing/repair)
 */
export const backfillSingleUser = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { status: "user_not_found", inserted: 0 };
    }

    // Delete existing preferences for clean slate
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const pref of existing) {
      await ctx.db.delete(pref._id);
    }

    if (!user.preferences) {
      return { status: "no_preferences", inserted: 0 };
    }

    let inserted = 0;
    const now = Date.now();
    const prefs = user.preferences;

    // Insert preferences
    for (const [key, value] of Object.entries(prefs)) {
      if (value === undefined || value === null) continue;

      if (key === "customInstructions" || key === "reasoning") {
        await ctx.db.insert("userPreferences", {
          userId: args.userId,
          category: key as any,
          key,
          value,
          createdAt: now,
          updatedAt: now,
        });
        inserted++;
        continue;
      }

      const category = PREFERENCE_CATEGORIES[key];
      if (category) {
        await ctx.db.insert("userPreferences", {
          userId: args.userId,
          category: category as any,
          key,
          value,
          createdAt: now,
          updatedAt: now,
        });
        inserted++;
      }
    }

    return { status: "success", inserted };
  },
});

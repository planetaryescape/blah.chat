/**
 * Routing Admin
 *
 * Admin queries/mutations for managing routing examples and stats.
 */

import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";

/**
 * Get routing examples by label.
 */
export const getExamplesByLabel = internalQuery({
  args: { routeLabel: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("routingExamples")
      .withIndex("by_routeLabel", (q) => q.eq("routeLabel", args.routeLabel))
      .collect();
  },
});

/**
 * Get routing feedback stats by label.
 */
export const getFeedbackStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const feedback = await ctx.db.query("routingFeedback").collect();

    const stats: Record<
      string,
      { total: number; thumbs_up: number; thumbs_down: number }
    > = {};

    for (const f of feedback) {
      if (!stats[f.routeLabel]) {
        stats[f.routeLabel] = { total: 0, thumbs_up: 0, thumbs_down: 0 };
      }
      stats[f.routeLabel].total++;
      if (f.signal === "thumbs_up") stats[f.routeLabel].thumbs_up++;
      if (f.signal === "thumbs_down") stats[f.routeLabel].thumbs_down++;
    }

    return stats;
  },
});

/**
 * Get routing example count per label.
 */
export const getExampleCounts = query({
  args: {},
  handler: async (ctx) => {
    const examples = await ctx.db.query("routingExamples").collect();
    const counts: Record<string, number> = {};

    for (const e of examples) {
      counts[e.routeLabel] = (counts[e.routeLabel] ?? 0) + 1;
    }

    return counts;
  },
});

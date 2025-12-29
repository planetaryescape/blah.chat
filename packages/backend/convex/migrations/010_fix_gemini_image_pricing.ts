/**
 * Migration: Fix Gemini 3 Pro Image pricing
 *
 * Problem: Output tokens were priced at $12/M instead of $120/M (10x underpriced)
 * Fix: Recalculate cost for all records using google:gemini-3-pro-image-preview
 *
 * Formula:
 *   - old: inputTokens * 2.0/M + outputTokens * 12.0/M
 *   - new: inputTokens * 2.0/M + outputTokens * 120.0/M
 *   - diff: outputTokens * 108.0/M
 */

import { internalMutation, internalQuery } from "../_generated/server";

export const getAffectedRecords = internalQuery({
  handler: async (ctx) => {
    const records = await ctx.db
      .query("usageRecords")
      .filter((q) =>
        q.eq(q.field("model"), "google:gemini-3-pro-image-preview"),
      )
      .collect();

    const totalOldCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalCostDiff = records.reduce(
      (sum, r) => sum + (r.outputTokens * 108.0) / 1_000_000,
      0,
    );

    return {
      count: records.length,
      totalOldCost: totalOldCost.toFixed(4),
      totalCostDiff: totalCostDiff.toFixed(4),
      totalNewCost: (totalOldCost + totalCostDiff).toFixed(4),
    };
  },
});

export const fixGeminiImagePricing = internalMutation({
  handler: async (ctx) => {
    const records = await ctx.db
      .query("usageRecords")
      .filter((q) =>
        q.eq(q.field("model"), "google:gemini-3-pro-image-preview"),
      )
      .collect();

    let updated = 0;
    for (const record of records) {
      const costDiff = (record.outputTokens * 108.0) / 1_000_000;
      await ctx.db.patch(record._id, {
        cost: record.cost + costDiff,
      });
      updated++;
    }

    return { updated };
  },
});

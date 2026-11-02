import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Get cached Bible verse by OSIS reference
 */
export const getCachedVerse = query({
  args: { osis: v.string() },
  handler: async (ctx, { osis }) => {
    const cached = await ctx.db
      .query("cachedBibleVerses")
      .withIndex("by_osis", (q) => q.eq("osis", osis))
      .first();

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
      return null;
    }

    return cached;
  },
});

/**
 * Cache a Bible verse (upsert)
 */
export const setCachedVerse = mutation({
  args: {
    osis: v.string(),
    reference: v.string(),
    text: v.string(),
    version: v.string(),
  },
  handler: async (ctx, { osis, reference, text, version }) => {
    // Check for existing
    const existing = await ctx.db
      .query("cachedBibleVerses")
      .withIndex("by_osis", (q) => q.eq("osis", osis))
      .first();

    if (existing) {
      // Update
      await ctx.db.patch(existing._id, {
        reference,
        text,
        version,
        cachedAt: Date.now(),
      });
      return existing._id;
    }

    // Insert new
    return await ctx.db.insert("cachedBibleVerses", {
      osis,
      reference,
      text,
      version,
      cachedAt: Date.now(),
    });
  },
});

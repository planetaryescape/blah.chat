import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const getCache = internalQuery({
  args: { hash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ttsCache")
      .withIndex("by_hash", (q) => q.eq("hash", args.hash))
      .first();
  },
});

export const saveCache = internalMutation({
  args: {
    hash: v.string(),
    storageId: v.id("_storage"),
    text: v.string(),
    voice: v.string(),
    speed: v.number(),
    format: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if exists to avoid dupes (though hash index should help)
    const existing = await ctx.db
      .query("ttsCache")
      .withIndex("by_hash", (q) => q.eq("hash", args.hash))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("ttsCache", {
      hash: args.hash,
      storageId: args.storageId,
      text: args.text,
      voice: args.voice,
      speed: args.speed,
      format: args.format,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    });
  },
});

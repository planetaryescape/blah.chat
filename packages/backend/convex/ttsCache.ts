import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { MAX_AUDIO_BYTES } from "./lib/speech/synthesis";

// Provider deadline is 30s; leave another minute for usage/cache writes and cleanup.
export const SYNTHESIS_CLAIM_TTL_MS = 90_000;

export const cleanupExpiredClaims = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("ttsSynthesisClaims")
      .withIndex("by_expiry", (q) => q.lte("expiresAt", Date.now()))
      .take(100);
    for (const claim of expired) await ctx.db.delete(claim._id);
  },
});

export const claimSynthesis = internalMutation({
  args: { userId: v.id("users"), hash: v.string(), claimToken: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const existing = await ctx.db
      .query("ttsSynthesisClaims")
      .withIndex("by_user_hash", (q) =>
        q.eq("userId", args.userId).eq("hash", args.hash),
      )
      .unique();
    if (existing && existing.expiresAt > Date.now()) return false;
    if (existing) await ctx.db.delete(existing._id);
    if (
      (
        await ctx.db
          .query("ttsSynthesisClaims")
          .withIndex("by_user", (q) => q.eq("userId", args.userId))
          .filter((q) => q.gt(q.field("expiresAt"), Date.now()))
          .take(100)
      ).length >= 100
    )
      return false;
    await ctx.db.insert("ttsSynthesisClaims", {
      ...args,
      expiresAt: Date.now() + SYNTHESIS_CLAIM_TTL_MS,
    });
    await ctx.scheduler.runAfter(
      SYNTHESIS_CLAIM_TTL_MS,
      internal.ttsCache.cleanupExpiredClaims,
      {},
    );
    return true;
  },
});

export const releaseSynthesis = internalMutation({
  args: { userId: v.id("users"), hash: v.string(), claimToken: v.string() },
  handler: async (ctx, args) => {
    const claim = await ctx.db
      .query("ttsSynthesisClaims")
      .withIndex("by_user_hash", (q) =>
        q.eq("userId", args.userId).eq("hash", args.hash),
      )
      .unique();
    if (claim?.claimToken === args.claimToken) await ctx.db.delete(claim._id);
  },
});

export const getCache = internalQuery({
  args: { hash: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("ttsCache")
      .withIndex("by_hash", (q) => q.eq("hash", args.hash))
      .first();
    if (cached?.userId && cached.userId !== args.userId)
      throw new ConvexError("Speech cache ownership mismatch");
    return cached;
  },
});

/** Only the authenticated TTS action supplies its already owner-derived hash. */
export const associateOwner = internalMutation({
  args: { hash: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const user = await ctx.db.get(args.userId);
    if (!identity || !user || user.clerkId !== identity.subject)
      throw new ConvexError("Unauthorized speech cache association");
    const cached = await ctx.db
      .query("ttsCache")
      .withIndex("by_hash", (q) => q.eq("hash", args.hash))
      .first();
    if (!cached) return false;
    if (cached.userId && cached.userId !== user._id)
      throw new ConvexError("Speech cache ownership mismatch");
    if (!cached.userId) await ctx.db.patch(cached._id, { userId: user._id });
    return true;
  },
});

/** Cascade integration: collect rows/blobs before deleting owned cache records. */
export async function listOwnedAudioCache(
  ctx: Pick<MutationCtx, "db">,
  userId: Id<"users">,
): Promise<Doc<"ttsCache">[]> {
  return ctx.db
    .query("ttsCache")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
}

/** Protect surviving foreign or unowned legacy references before blob deletion. */
export async function isAudioCacheBlobReferenced(
  ctx: Pick<MutationCtx, "db">,
  storageId: Id<"_storage">,
): Promise<boolean> {
  return !!(await ctx.db
    .query("ttsCache")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .first());
}

export const saveCache = internalMutation({
  args: {
    hash: v.string(),
    storageId: v.id("_storage"),
    text: v.string(),
    voice: v.string(),
    speed: v.number(),
    format: v.string(),
    claimToken: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.claimToken || args.userId) {
      if (!args.claimToken || !args.userId)
        throw new Error("Invalid speech cache claim");
      const userId = args.userId;
      const claim = await ctx.db
        .query("ttsSynthesisClaims")
        .withIndex("by_user_hash", (q) =>
          q.eq("userId", userId).eq("hash", args.hash),
        )
        .unique();
      if (
        !claim ||
        claim.claimToken !== args.claimToken ||
        claim.expiresAt <= Date.now()
      )
        throw new Error("Speech synthesis claim expired");
    }
    const { claimToken: _claimToken, ...cache } = args;
    // Fence in-flight synthesis against account deletion in this transaction.
    if (args.userId && !(await ctx.db.get(args.userId)))
      throw new ConvexError("Speech cache owner no longer exists");
    // Check if exists to avoid dupes (though hash index should help)
    const existing = await ctx.db
      .query("ttsCache")
      .withIndex("by_hash", (q) => q.eq("hash", args.hash))
      .first();

    if (existing) {
      // Legacy writes may remain unowned, but may never overwrite an owned row.
      if (existing.userId && existing.userId !== args.userId)
        throw new ConvexError("Speech cache ownership mismatch");
      const metadata = await ctx.db.system.get(existing.storageId);
      if (!metadata || metadata.size === 0 || metadata.size > MAX_AUDIO_BYTES) {
        // Repair the row atomically; keep the newly synthesized usable blob.
        await ctx.db.patch(existing._id, {
          ...cache,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
        });
        if (metadata && args.storageId !== existing.storageId)
          await ctx.storage.delete(existing.storageId);
        return existing._id;
      }
      if (!existing.userId && args.userId)
        await ctx.db.patch(existing._id, { userId: args.userId });
      if (args.storageId !== existing.storageId)
        await ctx.storage.delete(args.storageId);
      return existing._id;
    }

    return await ctx.db.insert("ttsCache", {
      userId: args.userId,
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

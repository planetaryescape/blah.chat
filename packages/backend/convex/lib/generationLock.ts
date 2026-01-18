/**
 * Generation Lock Utilities
 *
 * Database-level lock to prevent concurrent message generation per conversation.
 * Prevents: rate limit hits, cost spikes, confusing UI from spam sends.
 *
 * Key features:
 * - Single lock per conversation (no parallel generations)
 * - Comparison mode support: same comparisonGroupId allowed, tracks pendingCount
 * - Stale lock timeout: 60s (stuck message recovery handles longer failures)
 */

import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";
import { logger } from "./logger";

/** Lock timeout in milliseconds (60 seconds) */
const STALE_LOCK_TIMEOUT_MS = 60 * 1000;

/**
 * Acquire a generation lock for a conversation.
 * Returns true if lock acquired, false if conversation is already locked.
 *
 * Comparison mode: If same comparisonGroupId, increments pendingCount instead of blocking.
 */
export const acquireLock = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    messageId: v.optional(v.id("messages")),
    comparisonGroupId: v.optional(v.string()),
    modelCount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const now = Date.now();

    // Check for existing lock
    const existingLock = await ctx.db
      .query("generationLocks")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();

    if (existingLock) {
      // Check if stale (> 60s old) - delete and fall through to create new lock
      if (now - existingLock.lockedAt > STALE_LOCK_TIMEOUT_MS) {
        await ctx.db.delete(existingLock._id);
        logger.info("Deleted stale generation lock", {
          tag: "GenerationLock",
          conversationId: args.conversationId,
          ageMs: now - existingLock.lockedAt,
        });
        // Fall through to create new lock below
      }
      // Same comparison group - increment pendingCount and refresh lockedAt
      else if (
        args.comparisonGroupId &&
        existingLock.comparisonGroupId === args.comparisonGroupId
      ) {
        await ctx.db.patch(existingLock._id, {
          pendingCount: existingLock.pendingCount + (args.modelCount || 1),
          lockedAt: now, // Refresh to prevent stale timeout during long comparisons
        });
        logger.info("Incremented lock pendingCount for comparison", {
          tag: "GenerationLock",
          conversationId: args.conversationId,
          comparisonGroupId: args.comparisonGroupId,
          newCount: existingLock.pendingCount + (args.modelCount || 1),
        });
        return true;
      }
      // Active lock from different request - block
      else {
        logger.info("Lock acquisition blocked - conversation locked", {
          tag: "GenerationLock",
          conversationId: args.conversationId,
          existingComparisonGroupId: existingLock.comparisonGroupId,
          requestedComparisonGroupId: args.comparisonGroupId,
        });
        return false;
      }
    }

    // Create new lock
    await ctx.db.insert("generationLocks", {
      conversationId: args.conversationId,
      userId: args.userId,
      messageId: args.messageId,
      comparisonGroupId: args.comparisonGroupId,
      pendingCount: args.modelCount || 1,
      lockedAt: now,
    });

    logger.info("Acquired generation lock", {
      tag: "GenerationLock",
      conversationId: args.conversationId,
      comparisonGroupId: args.comparisonGroupId,
      modelCount: args.modelCount || 1,
    });

    return true;
  },
});

/**
 * Release a generation lock.
 * Decrements pendingCount; deletes lock when count reaches 0.
 */
export const releaseLock = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args): Promise<void> => {
    const lock = await ctx.db
      .query("generationLocks")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();

    if (!lock) {
      // No lock to release - may have been force-released or expired
      return;
    }

    if (lock.pendingCount <= 1) {
      // Last pending generation - delete the lock
      await ctx.db.delete(lock._id);
      logger.info("Released generation lock (deleted)", {
        tag: "GenerationLock",
        conversationId: args.conversationId,
      });
    } else {
      // Decrement pending count
      await ctx.db.patch(lock._id, {
        pendingCount: lock.pendingCount - 1,
      });
      logger.info("Decremented lock pendingCount", {
        tag: "GenerationLock",
        conversationId: args.conversationId,
        remainingCount: lock.pendingCount - 1,
      });
    }
  },
});

/**
 * Force release a lock - deletes regardless of pendingCount.
 * Use for error recovery and stuck message cleanup.
 */
export const forceReleaseLock = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args): Promise<void> => {
    const lock = await ctx.db
      .query("generationLocks")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();

    if (lock) {
      await ctx.db.delete(lock._id);
      logger.info("Force released generation lock", {
        tag: "GenerationLock",
        conversationId: args.conversationId,
        pendingCount: lock.pendingCount,
      });
    }
  },
});

/**
 * Check if a conversation is currently locked.
 * Also cleans up stale locks (> 60s).
 */
export const isLocked = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const lock = await ctx.db
      .query("generationLocks")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();

    if (!lock) return false;

    // Check if stale
    const now = Date.now();
    if (now - lock.lockedAt > STALE_LOCK_TIMEOUT_MS) {
      // Lock is stale - will be cleaned up on next write
      return false;
    }

    return true;
  },
});

/**
 * Check lock status - public query for frontend subscription.
 * Returns lock info including whether user can send messages.
 */
export const getLockStatus = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    isLocked: boolean;
    lockedAt?: number;
    pendingCount?: number;
  }> => {
    const lock = await ctx.db
      .query("generationLocks")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();

    if (!lock) {
      return { isLocked: false };
    }

    // Check if stale
    const now = Date.now();
    if (now - lock.lockedAt > STALE_LOCK_TIMEOUT_MS) {
      return { isLocked: false };
    }

    return {
      isLocked: true,
      lockedAt: lock.lockedAt,
      pendingCount: lock.pendingCount,
    };
  },
});

/**
 * Cleanup stale locks older than the timeout.
 * Called by cron job.
 *
 * Only deletes locks if there's no active generating message -
 * this prevents killing locks for legitimately long-running generations.
 */
export const cleanupStaleLocks = internalMutation({
  args: {
    maxAgeMs: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ cleaned: number }> => {
    const maxAge = args.maxAgeMs ?? STALE_LOCK_TIMEOUT_MS;
    const cutoff = Date.now() - maxAge;

    // Get all locks older than cutoff
    const staleLocks = await ctx.db
      .query("generationLocks")
      .filter((q) => q.lt(q.field("lockedAt"), cutoff))
      .collect();

    // Delete stale locks only if no active generation
    let cleaned = 0;
    for (const lock of staleLocks) {
      // Check if there's still an active generating message for this conversation
      const activeMessage = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", lock.conversationId),
        )
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "generating"),
          ),
        )
        .first();

      if (activeMessage) {
        // Lock is stale but generation still running - refresh lock instead of deleting
        await ctx.db.patch(lock._id, { lockedAt: Date.now() });
        logger.info("Refreshed lock for active generation", {
          tag: "GenerationLock",
          conversationId: lock.conversationId,
          messageId: activeMessage._id,
          originalAge: Date.now() - lock.lockedAt,
        });
      } else {
        // No active generation - safe to delete
        await ctx.db.delete(lock._id);
        cleaned++;
        logger.info("Cleaned up stale generation lock", {
          tag: "GenerationLock",
          conversationId: lock.conversationId,
          ageMs: Date.now() - lock.lockedAt,
        });
      }
    }

    if (cleaned > 0) {
      logger.info("Stale lock cleanup completed", {
        tag: "GenerationLock",
        cleaned,
        total: staleLocks.length,
      });
    }

    return { cleaned };
  },
});

/**
 * Public query for frontend to check if generation is locked.
 * Enables disabling send button while generating.
 * Returns false for stale locks (>60s) - actual cleanup done by cron.
 */
export const isGenerationLocked = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const lock = await ctx.db
      .query("generationLocks")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();

    if (!lock) return false;

    // Check if stale (> 60s)
    const now = Date.now();
    if (now - lock.lockedAt > STALE_LOCK_TIMEOUT_MS) {
      return false;
    }

    return true;
  },
});

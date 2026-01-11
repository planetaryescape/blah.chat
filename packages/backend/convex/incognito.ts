/**
 * Incognito Conversation Deletion Infrastructure
 *
 * Handles scheduled deletion with multiple triggers:
 * - Fire button (immediate)
 * - Inactivity timer (configurable)
 * - 24h hard limit cron
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { logger } from "./lib/logger";

/**
 * Schedule deletion after a delay (for inactivity timeout)
 */
export const scheduleDelete = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    delayMs: v.number(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv?.isIncognito) return;

    // Cancel existing scheduled deletion if any
    if (conv.incognitoSettings?.scheduledDeletionId) {
      try {
        await ctx.scheduler.cancel(conv.incognitoSettings.scheduledDeletionId);
      } catch {
        // Ignore if already executed or cancelled
      }
    }

    // Schedule new deletion
    const scheduledId = await ctx.scheduler.runAfter(
      args.delayMs,
      internal.incognito.executeDelete,
      { conversationId: args.conversationId },
    );

    // Update conversation with scheduled ID
    await ctx.db.patch(args.conversationId, {
      incognitoSettings: {
        ...conv.incognitoSettings,
        enableReadTools: conv.incognitoSettings?.enableReadTools ?? true,
        applyCustomInstructions:
          conv.incognitoSettings?.applyCustomInstructions ?? true,
        lastActivityAt: conv.incognitoSettings?.lastActivityAt ?? Date.now(),
        scheduledDeletionId: scheduledId,
      },
    });
  },
});

/**
 * Execute deletion - reuses existing cascade delete logic
 */
export const executeDelete = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return; // Already deleted

    // Only delete incognito conversations via this path
    if (!conv.isIncognito) {
      logger.warn("Attempted to delete non-incognito conversation", {
        tag: "Incognito",
        conversationId: args.conversationId,
      });
      return;
    }

    // === CASCADE DELETE (matches deleteConversation mutation) ===

    // 1. Delete bookmarks
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    for (const bookmark of bookmarks) {
      await ctx.db.delete(bookmark._id);
    }

    // 2. Delete shares
    const shares = await ctx.db
      .query("shares")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    for (const share of shares) {
      await ctx.db.delete(share._id);
    }

    // 3. Nullify files conversationId
    const files = await ctx.db
      .query("files")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    for (const file of files) {
      await ctx.db.patch(file._id, { conversationId: undefined });
    }

    // 4. Nullify memories conversationId
    const memories = await ctx.db
      .query("memories")
      .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
      .collect();
    for (const memory of memories) {
      await ctx.db.patch(memory._id, { conversationId: undefined });
    }

    // 5. Remove from projects
    const junctions = await ctx.db
      .query("projectConversations")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    for (const junction of junctions) {
      await ctx.db.delete(junction._id);
    }

    // 6. Delete participants (collaborative)
    if (conv.isCollaborative) {
      const participants = await ctx.db
        .query("conversationParticipants")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", args.conversationId),
        )
        .collect();
      for (const p of participants) {
        await ctx.db.delete(p._id);
      }
    }

    // 7. Delete messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // 8. Delete conversation
    await ctx.db.delete(args.conversationId);

    logger.info("Deleted incognito conversation", {
      tag: "Incognito",
      conversationId: args.conversationId,
    });
  },
});

/**
 * Record activity - resets inactivity timer
 */
export const recordActivity = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv?.isIncognito) return;

    const now = Date.now();
    const timeout = conv.incognitoSettings?.inactivityTimeoutMinutes;

    // Update lastActivityAt
    await ctx.db.patch(args.conversationId, {
      incognitoSettings: {
        ...conv.incognitoSettings,
        enableReadTools: conv.incognitoSettings?.enableReadTools ?? true,
        applyCustomInstructions:
          conv.incognitoSettings?.applyCustomInstructions ?? true,
        lastActivityAt: now,
      },
    });

    // Reschedule deletion if timeout configured
    if (timeout) {
      await ctx.scheduler.runAfter(0, internal.incognito.scheduleDelete, {
        conversationId: args.conversationId,
        delayMs: timeout * 60 * 1000,
      });
    }
  },
});

/**
 * Find stale incognito conversations (24h+ since last activity)
 */
export const findStale = internalQuery({
  args: { cutoffMs: v.number() },
  handler: async (ctx, args) => {
    // Query all incognito conversations
    const convos = await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("isIncognito"), true))
      .collect();

    // Filter stale ones
    return convos
      .filter((c) => {
        const lastActivity = c.incognitoSettings?.lastActivityAt ?? c.createdAt;
        return lastActivity < args.cutoffMs;
      })
      .map((c) => c._id);
  },
});

/**
 * Cleanup stale incognito conversations (24h cron)
 */
export const cleanupStale = internalAction({
  handler: async (ctx) => {
    const cutoffMs = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    const staleIds = (await ctx.runQuery(internal.incognito.findStale, {
      cutoffMs,
    })) as string[];

    if (staleIds.length === 0) {
      logger.info("No stale incognito conversations found", {
        tag: "IncognitoCleanup",
      });
      return;
    }

    logger.info("Deleting stale incognito conversations", {
      tag: "IncognitoCleanup",
      count: staleIds.length,
    });

    for (const convId of staleIds) {
      await ctx.runMutation(internal.incognito.executeDelete, {
        conversationId: convId as any,
      });
    }
  },
});

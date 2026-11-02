import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";
import { logger } from "../lib/logger";

/**
 * Force release generation lock for a conversation.
 * Used during stuck message recovery to clean up abandoned locks.
 */
async function forceReleaseLockForConversation(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
): Promise<void> {
  const lock = await ctx.db
    .query("generationLocks")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .first();

  if (lock) {
    await ctx.db.delete(lock._id);
    logger.info("Force released lock during message recovery", {
      tag: "MessageRecovery",
      conversationId,
      lockAge: Date.now() - lock.lockedAt,
    });
  }
}

/**
 * Maximum time a message can be in pending/generating state before it's considered stuck.
 *
 * Rationale for 10 minutes:
 * - Typical LLM generations in our workloads complete within seconds to a few minutes,
 *   including tool calls, but we occasionally see longer generations when:
 *   - The provider is degraded or rate-limiting.
 *   - The message triggers multiple tool invocations or long-running tools.
 * - The recovery cron runs every 2 minutes, so a 10-minute window gives several chances
 *   to observe progress before force-failing the message.
 * - A shorter threshold risks misclassifying slow-but-successful generations as stuck,
 *   especially during provider incidents.
 *
 * If we introduce message types with substantially different latency characteristics
 * (e.g. very long-running tools or models with known higher latency), consider making
 * this threshold configurable per message type instead of using a single global value.
 */
const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

/**
 * Recover messages stuck in pending/generating state
 * Called by cron job every 2 minutes
 */
export const recoverStuckMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoffTime = now - STUCK_THRESHOLD_MS;

    // Find messages stuck in generating state for too long
    const stuckGenerating = await ctx.db
      .query("messages")
      .withIndex("by_status", (q) => q.eq("status", "generating"))
      .filter((q) =>
        q.or(
          q.lt(q.field("generationStartedAt"), cutoffTime),
          q.and(
            q.eq(q.field("generationStartedAt"), undefined),
            q.lt(q.field("createdAt"), cutoffTime),
          ),
        ),
      )
      .collect();

    // Find messages stuck in pending state for too long
    const stuckPending = await ctx.db
      .query("messages")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
      .collect();

    const allStuck = [...stuckGenerating, ...stuckPending];

    if (allStuck.length === 0) {
      return { recovered: 0 };
    }

    logger.info("Recovering stuck messages", {
      tag: "MessageRecovery",
      count: allStuck.length,
      generating: stuckGenerating.length,
      pending: stuckPending.length,
    });

    // Mark each stuck message as error
    let recoveredCount = 0;
    for (const message of allStuck) {
      // Re-check status to avoid race condition with active generation
      const current = await ctx.db.get(message._id);
      if (
        !current ||
        (current.status !== "pending" && current.status !== "generating")
      ) {
        // Message was completed/updated since our query - skip it
        continue;
      }

      await ctx.db.patch(message._id, {
        status: "error",
        error:
          "Generation timed out. The AI took too long to respond. Please try again.",
        generationCompletedAt: now,
      });

      // Force release any generation lock for this conversation
      await forceReleaseLockForConversation(ctx, message.conversationId);

      recoveredCount++;

      logger.info("Recovered stuck message", {
        tag: "MessageRecovery",
        messageId: message._id,
        conversationId: message.conversationId,
        previousStatus: message.status,
        ageMinutes: Math.round((now - message.createdAt) / 60000),
      });
    }

    return { recovered: recoveredCount };
  },
});

/**
 * Check if a specific message is stuck and recover it
 * Can be called manually for a specific message
 */
export const recoverMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      return { recovered: false, reason: "Message not found" };
    }

    if (message.status !== "pending" && message.status !== "generating") {
      return {
        recovered: false,
        reason: `Message status is ${message.status}`,
      };
    }

    const now = Date.now();
    const age = now - message.createdAt;

    if (age < STUCK_THRESHOLD_MS) {
      return {
        recovered: false,
        reason: `Message is only ${Math.round(age / 60000)} minutes old`,
      };
    }

    await ctx.db.patch(args.messageId, {
      status: "error",
      error:
        "Generation timed out. The AI took too long to respond. Please try again.",
      generationCompletedAt: now,
    });

    // Force release any generation lock for this conversation
    await forceReleaseLockForConversation(ctx, message.conversationId);

    logger.info("Manually recovered stuck message", {
      tag: "MessageRecovery",
      messageId: args.messageId,
      ageMinutes: Math.round(age / 60000),
    });

    return { recovered: true };
  },
});

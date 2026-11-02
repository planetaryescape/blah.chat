"use node";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { logger } from "../lib/logger";

/**
 * Orchestrator: Backfill model field for all messages
 */
export const runBackfill = internalAction({
  handler: async (ctx) => {
    let totalUpdated = 0;
    let batches = 0;

    logger.info("Starting message model backfill", { tag: "Migration" });

    // Check initial state
    const initial = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.migrations["005_require_message_model"].getMessagesWithoutModel,
      {},
    )) as {
      total: number;
      assistantMessages: number;
      withoutModel: number;
      percentage: string;
    };

    logger.info("Initial state", {
      tag: "Migration",
      total: initial.total,
      assistantMessages: initial.assistantMessages,
      missingModel: initial.withoutModel,
      percentage: initial.percentage,
    });

    if (initial.withoutModel === 0) {
      logger.info("All messages already have model field", {
        tag: "Migration",
      });
      return { totalUpdated: 0, batches: 0 };
    }

    // Run in batches
    while (true) {
      const result = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.migrations["005_require_message_model"].backfillMessageModels,
        { batchSize: 100 },
      )) as { updated: number; skipped: number };

      totalUpdated += result.updated;
      batches++;

      logger.info("Batch processed", {
        tag: "Migration",
        batch: batches,
        updated: result.updated,
      });

      if (result.updated === 0) break; // No more to update
    }

    // Verify final state
    const final = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.migrations["005_require_message_model"].getMessagesWithoutModel,
      {},
    )) as {
      total: number;
      assistantMessages: number;
      withoutModel: number;
      percentage: string;
    };

    logger.info("Backfill complete", {
      tag: "Migration",
      updated: totalUpdated,
      batches,
      remainingWithoutModel: final.withoutModel,
    });

    if (final.withoutModel > 0) {
      logger.warn("Messages still missing model", {
        tag: "Migration",
        count: final.withoutModel,
      });
    } else {
      logger.info("All messages have model - safe to make field required", {
        tag: "Migration",
      });
    }

    return { totalUpdated, batches, remaining: final.withoutModel };
  },
});

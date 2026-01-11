/**
 * Phase 4: User Preferences Backfill Orchestrator
 *
 * Coordinates batched backfill of user preferences from nested object to flat table.
 * Runs as Node.js action for full platform capabilities.
 */

"use node";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { logger } from "../lib/logger";

/**
 * Orchestrator: Run full backfill in batches
 */
export const runBackfill = internalAction({
  handler: async (ctx) => {
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalSkipped = 0;
    let batches = 0;
    const startTime = Date.now();

    logger.info("Starting user preferences backfill", { tag: "Migration" });

    // Check initial state
    const initial = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.migrations["006_user_preferences_backfill"].getBackfillStatus,
      {},
    )) as {
      totalUsers: number;
      usersWithPrefs: number;
      remaining: number;
      percentage: string;
    };

    logger.info("Initial state", {
      tag: "Migration",
      totalUsers: initial.totalUsers,
      alreadyBackfilled: initial.usersWithPrefs,
      remaining: initial.remaining,
      percentageRemaining: `${100 - Number.parseFloat(initial.percentage)}%`,
    });

    if (initial.remaining === 0) {
      logger.info("All users already backfilled", { tag: "Migration" });
      return { totalProcessed: 0, totalInserted: 0, batches: 0 };
    }

    // Run in batches of 100 users
    while (totalProcessed < initial.remaining) {
      const result = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.migrations["006_user_preferences_backfill"].backfillBatch,
        { batchSize: 100 },
      )) as { processed: number; inserted: number; skipped: number };

      totalProcessed += result.processed;
      totalInserted += result.inserted;
      totalSkipped += result.skipped;
      batches++;

      logger.info("Batch processed", {
        tag: "Migration",
        batch: batches,
        processed: result.processed,
        inserted: result.inserted,
        skipped: result.skipped,
      });

      // Stop if no users processed (all backfilled)
      if (result.processed === 0 || result.skipped === result.processed) {
        break;
      }
    }

    // Verify final state
    const final = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.migrations["006_user_preferences_backfill"].getBackfillStatus,
      {},
    )) as {
      totalUsers: number;
      usersWithPrefs: number;
      remaining: number;
      percentage: string;
    };

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info("Backfill complete", {
      tag: "Migration",
      durationSec: duration,
      batches,
      usersProcessed: totalProcessed,
      preferencesInserted: totalInserted,
      usersSkipped: totalSkipped,
      finalCoverage: `${final.percentage}%`,
    });

    if (final.remaining > 0) {
      logger.warn("Users still need backfill", {
        tag: "Migration",
        remaining: final.remaining,
      });
    } else {
      logger.info("All users backfilled successfully", { tag: "Migration" });
    }

    return {
      totalProcessed,
      totalInserted,
      totalSkipped,
      batches,
      duration: Number.parseFloat(duration),
      finalCoverage: Number.parseFloat(final.percentage),
    };
  },
});

/**
 * Verify migration data integrity
 */
export const verifyMigration = internalAction({
  args: {},
  handler: async (ctx) => {
    logger.info("Verifying migration data integrity", { tag: "Migration" });

    const status = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.migrations["006_user_preferences_backfill"].getBackfillStatus,
      {},
    )) as {
      totalUsers: number;
      usersWithPrefs: number;
      remaining: number;
      percentage: string;
    };

    logger.info("Coverage status", {
      tag: "Migration",
      coverage: `${status.percentage}%`,
      totalUsers: status.totalUsers,
      withPreferences: status.usersWithPrefs,
      remaining: status.remaining,
    });

    if (status.remaining === 0) {
      logger.info("Migration verified: 100% coverage", { tag: "Migration" });
      return { status: "success", coverage: 100 };
    }

    logger.warn("Migration incomplete", {
      tag: "Migration",
      remaining: status.remaining,
    });
    return {
      status: "incomplete",
      coverage: Number.parseFloat(status.percentage),
      remaining: status.remaining,
    };
  },
});

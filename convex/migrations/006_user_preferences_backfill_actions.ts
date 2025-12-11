/**
 * Phase 4: User Preferences Backfill Orchestrator
 *
 * Coordinates batched backfill of user preferences from nested object to flat table.
 * Runs as Node.js action for full platform capabilities.
 */

"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

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

    console.log("🚀 Starting user preferences backfill...");

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

    console.log(`📊 Initial state:`);
    console.log(`   Total users: ${initial.totalUsers}`);
    console.log(`   Already backfilled: ${initial.usersWithPrefs}`);
    console.log(`   Remaining: ${initial.remaining} (${100 - Number.parseFloat(initial.percentage)}%)`);

    if (initial.remaining === 0) {
      console.log("✅ All users already backfilled");
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

      console.log(
        `✅ Batch ${batches}: processed ${result.processed} users, inserted ${result.inserted} preferences, skipped ${result.skipped}`,
      );

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

    console.log(`\n🎉 Backfill complete!`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Batches: ${batches}`);
    console.log(`   Users processed: ${totalProcessed}`);
    console.log(`   Preferences inserted: ${totalInserted}`);
    console.log(`   Users skipped: ${totalSkipped}`);
    console.log(`   Final coverage: ${final.percentage}%`);

    if (final.remaining > 0) {
      console.warn(
        `⚠️  Warning: ${final.remaining} users still need backfill`,
      );
    } else {
      console.log("✅ All users backfilled successfully");
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
    console.log("🔍 Verifying migration data integrity...");

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

    console.log(`📊 Coverage: ${status.percentage}%`);
    console.log(`   Total users: ${status.totalUsers}`);
    console.log(`   With preferences: ${status.usersWithPrefs}`);
    console.log(`   Remaining: ${status.remaining}`);

    if (status.remaining === 0) {
      console.log("✅ Migration verified: 100% coverage");
      return { status: "success", coverage: 100 };
    }

    console.warn(`⚠️  Migration incomplete: ${status.remaining} users remaining`);
    return {
      status: "incomplete",
      coverage: Number.parseFloat(status.percentage),
      remaining: status.remaining,
    };
  },
});

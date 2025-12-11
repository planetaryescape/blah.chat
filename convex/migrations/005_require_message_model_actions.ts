"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Orchestrator: Backfill model field for all messages
 */
export const runBackfill = internalAction({
  handler: async (ctx) => {
    let totalUpdated = 0;
    let batches = 0;

    console.log("🚀 Starting message model backfill...");

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

    console.log(`Total messages: ${initial.total}`);
    console.log(`Assistant messages: ${initial.assistantMessages}`);
    console.log(
      `Missing model: ${initial.withoutModel} (${initial.percentage}%)`,
    );

    if (initial.withoutModel === 0) {
      console.log("✅ All messages already have model field");
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

      console.log(`✅ Batch ${batches}: updated ${result.updated} messages`);

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

    console.log(`\n🎉 Backfill complete!`);
    console.log(`   Updated ${totalUpdated} messages in ${batches} batches`);
    console.log(`   Remaining without model: ${final.withoutModel}`);

    if (final.withoutModel > 0) {
      console.warn(
        `⚠️  Warning: ${final.withoutModel} messages still missing model`,
      );
    } else {
      console.log("✅ All messages have model - safe to make field required");
    }

    return { totalUpdated, batches, remaining: final.withoutModel };
  },
});

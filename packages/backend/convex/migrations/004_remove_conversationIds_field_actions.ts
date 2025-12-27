"use node";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

/**
 * Orchestrator: Remove conversationIds field from all projects
 */
export const runCleanup = internalAction({
  handler: async (ctx) => {
    let totalUpdated = 0;
    let batches = 0;

    console.log("🚀 Starting conversationIds field removal...");

    // Check initial state
    const initial = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.migrations["004_remove_conversationIds_field"]
        .countProjectsWithConversationIds,
      {},
    )) as { total: number; withField: number; percentage: string };

    console.log(
      `Found ${initial.withField} projects with conversationIds field (${initial.percentage}%)`,
    );

    // Run in batches
    while (true) {
      const result = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.migrations["004_remove_conversationIds_field"]
          .removeConversationIdsFromProjects,
        { batchSize: 100 },
      )) as { updated: number; remaining: number };

      totalUpdated += result.updated;
      batches++;

      console.log(
        `✅ Batch ${batches}: cleaned ${result.updated} projects, ${result.remaining} remaining`,
      );

      if (result.updated === 0) break; // No more to clean
    }

    // Verify final state
    const final = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.migrations["004_remove_conversationIds_field"]
        .countProjectsWithConversationIds,
      {},
    )) as { total: number; withField: number; percentage: string };

    console.log(`\n🎉 Cleanup complete!`);
    console.log(`   Projects cleaned: ${totalUpdated}`);
    console.log(`   Batches: ${batches}`);
    console.log(`   Remaining with field: ${final.withField}`);

    if (final.withField > 0) {
      console.warn(
        `⚠️  Warning: ${final.withField} projects still have conversationIds field`,
      );
    } else {
      console.log("✅ All projects cleaned - safe to update schema");
    }

    return { totalUpdated, batches, remaining: final.withField };
  },
});

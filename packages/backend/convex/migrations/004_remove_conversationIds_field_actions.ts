"use node";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { logger } from "../lib/logger";

/**
 * Orchestrator: Remove conversationIds field from all projects
 */
export const runCleanup = internalAction({
  handler: async (ctx) => {
    let totalUpdated = 0;
    let batches = 0;

    logger.info("Starting conversationIds field removal", { tag: "Migration" });

    // Check initial state
    const initial = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.migrations["004_remove_conversationIds_field"]
        .countProjectsWithConversationIds,
      {},
    )) as { total: number; withField: number; percentage: string };

    logger.info("Found projects with conversationIds field", {
      tag: "Migration",
      withField: initial.withField,
      percentage: initial.percentage,
    });

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

      logger.info("Batch processed", {
        tag: "Migration",
        batch: batches,
        cleaned: result.updated,
        remaining: result.remaining,
      });

      if (result.updated === 0) break; // No more to clean
    }

    // Verify final state
    const final = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.migrations["004_remove_conversationIds_field"]
        .countProjectsWithConversationIds,
      {},
    )) as { total: number; withField: number; percentage: string };

    logger.info("Cleanup complete", {
      tag: "Migration",
      projectsCleaned: totalUpdated,
      batches,
      remainingWithField: final.withField,
    });

    if (final.withField > 0) {
      logger.warn("Projects still have conversationIds field", {
        tag: "Migration",
        count: final.withField,
      });
    } else {
      logger.info("All projects cleaned - safe to update schema", {
        tag: "Migration",
      });
    }

    return { totalUpdated, batches, remaining: final.withField };
  },
});

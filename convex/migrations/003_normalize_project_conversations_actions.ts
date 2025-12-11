"use node";

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Orchestrator: batch processing with cursor pagination
 */
export const runBackfill = internalAction({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 50;
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let cursor: string | null = null;
    let batches = 0;

    console.log("🚀 Starting project-conversation backfill...");

    do {
      // Fetch batch
      const batch = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.migrations["003_normalize_project_conversations"]
          .getProjectsBatch,
        cursor ? { cursor, batchSize } : { batchSize },
      )) as {
        projects: Array<{
          _id: Id<"projects">;
          conversationIds: Id<"conversations">[];
          userId: Id<"users">;
        }>;
        nextCursor: string | null;
      };

      if (batch.projects.length === 0) break;

      // Process batch
      const result = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.migrations["003_normalize_project_conversations"].backfillBatch,
        { projects: batch.projects },
      )) as { created: number; skipped: number; errors: number };

      totalCreated += result.created;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
      batches++;
      cursor = batch.nextCursor;

      console.log(
        `✅ Batch ${batches}: created ${result.created}, skipped ${result.skipped}, errors ${result.errors}`,
      );
    } while (cursor !== null);

    console.log(`\n🎉 Backfill complete!`);
    console.log(`   Batches: ${batches}`);
    console.log(`   Created: ${totalCreated}`);
    console.log(`   Skipped: ${totalSkipped}`);
    console.log(`   Errors: ${totalErrors}`);

    return { totalCreated, totalSkipped, totalErrors, batches };
  },
});

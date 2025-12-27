import { internalMutation } from "../_generated/server";

/**
 * One-time migration to backfill memory extraction tracking fields
 * on existing messages. This prevents re-processing the entire
 * conversation history when incremental extraction is deployed.
 *
 * Run this once via Convex dashboard after deploying schema changes.
 *
 * Usage:
 * 1. Deploy schema with new fields (memoryExtracted, memoryExtractedAt, lastExtractedMessageId)
 * 2. Navigate to Convex dashboard → Functions
 * 3. Run: migrations/backfill-memory-extraction.backfillMemoryExtraction
 * 4. Verify: Check output for updated count
 */
export const backfillMemoryExtraction = internalMutation({
  handler: async (ctx) => {
    const startTime = Date.now();

    // Fetch all messages (may be slow for large datasets)
    const allMessages = await ctx.db.query("messages").collect();

    console.log(`[Migration] Found ${allMessages.length} messages to backfill`);

    let updated = 0;
    const batchSize = 100;

    // Process in batches to avoid timeout
    for (let i = 0; i < allMessages.length; i += batchSize) {
      const batch = allMessages.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (message) => {
          await ctx.db.patch(message._id, {
            memoryExtracted: true,
            memoryExtractedAt: message._creationTime, // Use creation time as proxy
          });
          updated++;
        }),
      );

      if (i % 500 === 0 && i > 0) {
        console.log(
          `[Migration] Processed ${updated}/${allMessages.length} messages...`,
        );
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      `[Migration] ✅ Backfilled ${updated} messages with extraction tracking in ${Math.round(duration / 1000)}s`,
    );

    return {
      updated,
      total: allMessages.length,
      durationMs: duration,
    };
  },
});

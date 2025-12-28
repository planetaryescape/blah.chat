/**
 * Migration: Backfill feature and operationType fields in usageRecords
 *
 * Adds feature and operationType to existing usage records based on:
 * - presentationId -> "slides"
 * - conversationId -> "chat"
 * - Model name pattern matching for operation type
 *
 * Run in batches to avoid Convex 10-minute action timeout.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";

type FeatureType =
  | "chat"
  | "slides"
  | "notes"
  | "tasks"
  | "files"
  | "memory"
  | "smart_assistant";
type OperationType = "text" | "tts" | "stt" | "image";

/**
 * Derive feature and operationType from model name for legacy records
 */
function deriveFromModel(model: string): {
  feature: FeatureType;
  operationType: OperationType;
} {
  const modelLower = model.toLowerCase();

  if (modelLower.includes("whisper")) {
    return { feature: "chat", operationType: "stt" };
  }
  if (modelLower.includes("tts")) {
    return { feature: "chat", operationType: "tts" };
  }
  if (modelLower.includes("dall-e") || modelLower.includes("dalle")) {
    return { feature: "chat", operationType: "image" };
  }
  if (
    modelLower.includes("image") &&
    (modelLower.includes("gemini") || modelLower.includes("google"))
  ) {
    return { feature: "slides", operationType: "image" };
  }
  return { feature: "chat", operationType: "text" };
}

/**
 * Query: Check backfill progress
 */
export const getBackfillStatus = internalQuery({
  handler: async (ctx) => {
    const allRecords = await ctx.db.query("usageRecords").collect();
    const withFeature = allRecords.filter((r) => r.feature !== undefined);

    return {
      total: allRecords.length,
      withFeature: withFeature.length,
      remaining: allRecords.length - withFeature.length,
      percentage:
        allRecords.length > 0
          ? ((withFeature.length / allRecords.length) * 100).toFixed(1)
          : "100",
    };
  },
});

/**
 * Query: Get records needing backfill (paginated)
 */
export const getRecordsToBackfill = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("usageRecords")
      .paginate({ cursor: args.cursor, numItems: args.batchSize });

    // Filter to only records without feature field
    const needsBackfill = records.page.filter((r) => r.feature === undefined);

    return {
      records: needsBackfill.map((r) => ({
        _id: r._id,
        model: r.model,
        conversationId: r.conversationId,
        presentationId: r.presentationId,
      })),
      nextCursor: records.continueCursor,
      isDone: records.isDone,
    };
  },
});

/**
 * Mutation: Backfill feature and operationType for a batch of records
 */
export const backfillBatch = internalMutation({
  args: {
    batchSize: v.number(),
  },
  handler: async (ctx, args) => {
    let updated = 0;
    let skipped = 0;

    // Get records without feature field
    const records = await ctx.db
      .query("usageRecords")
      .take(args.batchSize * 2); // Take extra to filter

    const toUpdate = records.filter((r) => r.feature === undefined);

    for (const record of toUpdate.slice(0, args.batchSize)) {
      // Determine feature and operationType
      let feature: FeatureType;
      let operationType: OperationType;

      // If has presentationId, it's slides
      if (record.presentationId) {
        feature = "slides";
        operationType = "image"; // Slide images
      } else {
        // Derive from model name
        const derived = deriveFromModel(record.model);
        feature = derived.feature;
        operationType = derived.operationType;
      }

      await ctx.db.patch(record._id, {
        feature,
        operationType,
      });
      updated++;
    }

    return {
      updated,
      skipped,
      hasMore: toUpdate.length > args.batchSize,
    };
  },
});

/**
 * Mutation: Run full backfill (call repeatedly until done)
 */
export const runBackfill = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    let totalUpdated = 0;
    let iterations = 0;
    const maxIterations = 50; // Safety limit per invocation

    while (iterations < maxIterations) {
      const records = await ctx.db
        .query("usageRecords")
        .take(batchSize);

      const toUpdate = records.filter((r) => r.feature === undefined);

      if (toUpdate.length === 0) {
        break; // Done
      }

      for (const record of toUpdate) {
        let feature: FeatureType;
        let operationType: OperationType;

        if (record.presentationId) {
          feature = "slides";
          operationType = "image";
        } else {
          const derived = deriveFromModel(record.model);
          feature = derived.feature;
          operationType = derived.operationType;
        }

        await ctx.db.patch(record._id, {
          feature,
          operationType,
        });
        totalUpdated++;
      }

      iterations++;
    }

    // Check if more work needed
    const remaining = await ctx.db
      .query("usageRecords")
      .filter((q) => q.eq(q.field("feature"), undefined))
      .take(1);

    return {
      updated: totalUpdated,
      iterations,
      hasMore: remaining.length > 0,
      message:
        remaining.length > 0
          ? "More records to process. Run again."
          : "Backfill complete!",
    };
  },
});

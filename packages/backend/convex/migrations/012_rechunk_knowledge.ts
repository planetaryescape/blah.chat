/**
 * Migration 012: Re-chunk Knowledge with New Size
 *
 * Re-processes all knowledgeSources with the new optimal chunk size (500 tokens).
 * This deletes existing chunks and re-generates them with the new parameters.
 *
 * Process:
 * 1. Find all completed knowledgeSources
 * 2. Delete their existing chunks
 * 3. Schedule re-processing with new chunk parameters
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

const MIGRATION_ID = "012_rechunk_knowledge";
const MIGRATION_NAME = "Re-chunk Knowledge with Optimal Size";

/**
 * Backfill batch - processes one batch of knowledgeSources
 */
export const backfillBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  handler: async (ctx, { cursor, batchSize }) => {
    // Paginate through completed knowledgeSources
    const result = await ctx.db
      .query("knowledgeSources")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .order("desc")
      .paginate({ cursor, numItems: batchSize });

    let sourcesQueued = 0;
    let chunksDeleted = 0;
    let itemsProcessed = 0;
    let skipped = 0;

    for (const source of result.page) {
      itemsProcessed++;

      // Skip sources already being reprocessed
      if (source.status !== "completed") {
        skipped++;
        continue;
      }

      // Delete existing chunks for this source
      const chunks = await ctx.db
        .query("knowledgeChunks")
        .withIndex("by_source", (q) => q.eq("sourceId", source._id))
        .collect();

      for (const chunk of chunks) {
        await ctx.db.delete(chunk._id);
        chunksDeleted++;
      }

      // Reset source status to trigger re-processing
      await ctx.db.patch(source._id, {
        status: "pending",
        chunkCount: undefined,
        processedAt: undefined,
        error: undefined,
        updatedAt: Date.now(),
      });

      // Schedule re-processing
      await ctx.scheduler.runAfter(
        0,
        internal.knowledgeBank.process.processSource,
        { sourceId: source._id },
      );
      sourcesQueued++;
    }

    // Update migration progress
    const migration = await ctx.db
      .query("migrations")
      .withIndex("by_migration_id", (q) => q.eq("migrationId", MIGRATION_ID))
      .first();

    if (migration) {
      await ctx.db.patch(migration._id, {
        processedRecords: migration.processedRecords + itemsProcessed,
        checkpoint: {
          cursor: result.continueCursor,
          processedCount: migration.processedRecords + itemsProcessed,
          successCount:
            (migration.checkpoint?.successCount || 0) + sourcesQueued,
          errorCount: migration.checkpoint?.errorCount || 0,
          lastProcessedId: result.page[result.page.length - 1]?._id,
        },
        updatedAt: Date.now(),
      });
    }

    return {
      done: result.isDone,
      nextCursor: result.continueCursor,
      processed: itemsProcessed,
      sourcesQueued,
      chunksDeleted,
      skipped,
    };
  },
});

/**
 * Orchestrator action - manages full migration lifecycle
 */
export const migrate = internalAction({
  handler: async (ctx) => {
    console.log(`🚀 Starting ${MIGRATION_NAME}...`);
    console.log(`   Migration ID: ${MIGRATION_ID}`);
    console.log(`   New chunk size: 500 tokens (~2000 chars)`);
    console.log(`   New overlap: 75 tokens (~300 chars)`);

    const startTime = Date.now();

    // Create or resume migration record
    let migration = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.migrations["012_rechunk_knowledge"].getMigrationState,
      {},
    )) as Doc<"migrations"> | null;

    if (!migration) {
      migration = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.migrations["012_rechunk_knowledge"].initializeMigration,
        {},
      )) as Doc<"migrations">;
      console.log("✅ Migration initialized");
    } else if (migration.status === "completed") {
      console.log("⚠️  Migration already completed");
      return;
    } else {
      console.log(`🔄 Resuming migration from cursor...`);
    }

    // Run backfill in batches
    let cursor: string | null = migration.checkpoint?.cursor ?? null;
    let totalProcessed = migration.processedRecords || 0;
    let totalQueued = 0;
    let totalChunksDeleted = 0;
    let totalSkipped = 0;
    let batchCount = 0;

    do {
      const result = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.migrations["012_rechunk_knowledge"].backfillBatch,
        { cursor, batchSize: 20 }, // Smaller batches to avoid overloading
      )) as {
        done: boolean;
        nextCursor?: string;
        processed: number;
        sourcesQueued: number;
        chunksDeleted: number;
        skipped: number;
      };

      cursor = result.nextCursor ?? null;
      totalProcessed += result.processed;
      totalQueued += result.sourcesQueued;
      totalChunksDeleted += result.chunksDeleted;
      totalSkipped += result.skipped;
      batchCount++;

      console.log(
        `   Batch ${batchCount}: ${result.processed} sources (${result.sourcesQueued} queued, ${result.chunksDeleted} chunks deleted, ${result.skipped} skipped)`,
      );

      if (result.done) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.migrations["012_rechunk_knowledge"].completeMigration,
          { totalQueued, totalChunksDeleted, totalSkipped },
        );
        break;
      }
    } while (cursor);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Migration queued!`);
    console.log(`   Sources processed: ${totalProcessed}`);
    console.log(`   Re-processing queued: ${totalQueued}`);
    console.log(`   Old chunks deleted: ${totalChunksDeleted}`);
    console.log(`   Skipped: ${totalSkipped}`);
    console.log(`   Duration: ${duration}s`);
    console.log(
      `\n⏳ Note: Re-processing is running in background. Check source statuses.`,
    );
  },
});

// Helper queries/mutations

export const getMigrationState = internalQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("migrations")
      .withIndex("by_migration_id", (q) => q.eq("migrationId", MIGRATION_ID))
      .first();
  },
});

export const initializeMigration = internalMutation({
  handler: async (ctx) => {
    const id = await ctx.db.insert("migrations", {
      migrationId: MIGRATION_ID,
      name: MIGRATION_NAME,
      phase: "backfill",
      status: "running",
      processedRecords: 0,
      checkpoint: {
        processedCount: 0,
        successCount: 0,
        errorCount: 0,
      },
      startedAt: Date.now(),
      executedBy: "system",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const completeMigration = internalMutation({
  args: {
    totalQueued: v.number(),
    totalChunksDeleted: v.number(),
    totalSkipped: v.number(),
  },
  handler: async (ctx, args) => {
    const migration = await ctx.db
      .query("migrations")
      .withIndex("by_migration_id", (q) => q.eq("migrationId", MIGRATION_ID))
      .first();

    if (migration) {
      await ctx.db.patch(migration._id, {
        status: "completed",
        phase: "complete",
        completedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Verification - check re-chunking progress

export const checkProgress = internalQuery({
  handler: async (ctx) => {
    const sources = await ctx.db.query("knowledgeSources").collect();

    const byStatus = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    let totalChunks = 0;
    let avgChunksPerSource = 0;

    for (const source of sources) {
      byStatus[source.status]++;
      if (source.chunkCount) {
        totalChunks += source.chunkCount;
      }
    }

    if (byStatus.completed > 0) {
      avgChunksPerSource = Math.round(totalChunks / byStatus.completed);
    }

    return {
      totalSources: sources.length,
      byStatus,
      totalChunks,
      avgChunksPerSource,
      isComplete: byStatus.pending === 0 && byStatus.processing === 0,
    };
  },
});

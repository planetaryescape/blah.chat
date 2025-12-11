// Phase 1 Cleanup: Remove deprecated fields from messages table
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

const MIGRATION_ID = "002_cleanup_deprecated_fields";
const MIGRATION_NAME = "Phase 1 Cleanup: Remove Deprecated Fields";

// Cleanup mutation - processes one batch of messages
export const cleanupBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  handler: async (ctx, { cursor, batchSize }) => {
    const result = await ctx.db
      .query("messages")
      .order("desc")
      .paginate({ cursor, numItems: batchSize });

    let messagesUpdated = 0;

    for (const msg of result.page) {
      // Check if message has any deprecated fields
      const hasDeprecatedFields =
        (msg as any).attachments ||
        (msg as any).toolCalls ||
        (msg as any).partialToolCalls;

      if (hasDeprecatedFields) {
        // Remove deprecated fields (TypeScript workaround)
        const updates: any = {
          updatedAt: Date.now(),
        };

        // Clear deprecated fields
        if ((msg as any).attachments) updates.attachments = undefined;
        if ((msg as any).toolCalls) updates.toolCalls = undefined;
        if ((msg as any).partialToolCalls) updates.partialToolCalls = undefined;

        await ctx.db.patch(msg._id, updates);
        messagesUpdated++;
      }
    }

    // Update migration progress
    await ctx.db
      .query("migrations")
      .withIndex("by_migration_id", (q) => q.eq("migrationId", MIGRATION_ID))
      .first()
      .then(async (migration) => {
        if (migration) {
          await ctx.db.patch(migration._id, {
            processedRecords: migration.processedRecords + result.page.length,
            checkpoint: {
              cursor: result.continueCursor,
              processedCount: migration.processedRecords + result.page.length,
              successCount:
                (migration.checkpoint?.successCount || 0) + messagesUpdated,
              errorCount: migration.checkpoint?.errorCount || 0,
              lastProcessedId: result.page[result.page.length - 1]?._id,
            },
            updatedAt: Date.now(),
          });
        }
      });

    return {
      done: result.isDone,
      nextCursor: result.continueCursor,
      processed: result.page.length,
      updated: messagesUpdated,
    };
  },
});

// Orchestrator action
export const migrate = internalAction({
  handler: async (ctx) => {
    console.log(`🚀 Starting ${MIGRATION_NAME}...`);
    console.log(`   Migration ID: ${MIGRATION_ID}`);

    const startTime = Date.now();

    // Create or resume migration record
    let migration = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.migrations["002_cleanup_deprecated_fields"].getMigrationState,
      {},
    )) as Doc<"migrations"> | null;

    if (!migration) {
      migration = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.migrations["002_cleanup_deprecated_fields"]
          .initializeMigration,
        {},
      )) as Doc<"migrations">;
      console.log("✅ Migration initialized");
    } else if (migration.status === "completed") {
      console.log("⚠️  Migration already completed");
      return;
    } else {
      console.log(`🔄 Resuming migration from cursor...`);
    }

    // Run cleanup in batches
    let cursor: string | null = migration.checkpoint?.cursor ?? null;
    let totalProcessed = migration.processedRecords || 0;
    let totalUpdated = 0;
    let batchCount = 0;

    do {
      const result = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.migrations["002_cleanup_deprecated_fields"].cleanupBatch,
        { cursor, batchSize: 100 },
      )) as {
        done: boolean;
        nextCursor?: string;
        processed: number;
        updated: number;
      };

      cursor = result.nextCursor ?? null;
      totalProcessed += result.processed;
      totalUpdated += result.updated;
      batchCount++;

      console.log(
        `   Batch ${batchCount}: ${result.processed} messages (${result.updated} updated)`,
      );

      if (result.done) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.migrations["002_cleanup_deprecated_fields"]
            .completeMigration,
          { totalUpdated },
        );
        break;
      }
    } while (cursor);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Cleanup complete!`);
    console.log(`   Messages processed: ${totalProcessed}`);
    console.log(`   Messages updated: ${totalUpdated}`);
    console.log(`   Batches: ${batchCount}`);
    console.log(`   Duration: ${duration}s`);
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
    totalUpdated: v.number(),
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

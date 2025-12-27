// Phase 1: Normalize Message Attachments & Tool Calls
// Extracts nested arrays to separate tables for SQL-readiness

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

const MIGRATION_ID = "001_normalize_message_attachments";
const MIGRATION_NAME = "Phase 1: Message Attachments & Tool Calls";

// Backfill mutation - processes one batch of messages
export const backfillBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  handler: async (ctx, { cursor, batchSize }) => {
    // Paginate through messages
    const result = await ctx.db
      .query("messages")
      .order("desc")
      .paginate({ cursor, numItems: batchSize });

    let attachmentsCreated = 0;
    let toolCallsCreated = 0;
    let messagesProcessed = 0;

    for (const msg of result.page) {
      // Skip if already migrated (check if new table has data)
      const existingAttachments = await ctx.db
        .query("attachments")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .first();

      const existingToolCalls = await ctx.db
        .query("toolCalls")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .first();

      // Skip if both already migrated
      if (existingAttachments && existingToolCalls) {
        messagesProcessed++;
        continue;
      }

      // Migrate attachments
      if (!existingAttachments && (msg as any).attachments?.length) {
        for (const att of (msg as any).attachments) {
          await ctx.db.insert("attachments", {
            messageId: msg._id,
            conversationId: msg.conversationId,
            userId: msg.userId!,
            type: att.type,
            name: att.name,
            // Type conversion: old schema used string, new uses Id<"_storage">
            storageId: att.storageId as Id<"_storage">,
            mimeType: att.mimeType,
            size: att.size,
            metadata: att.metadata
              ? {
                  width: (att.metadata as any).width,
                  height: (att.metadata as any).height,
                  duration: (att.metadata as any).duration,
                  prompt: (att.metadata as any).prompt,
                  model: (att.metadata as any).model,
                  generationTime: (att.metadata as any).generationTime,
                }
              : undefined,
            createdAt: msg.createdAt,
          });
          attachmentsCreated++;
        }
      }

      // Migrate tool calls (merge final + partial into single table)
      if (!existingToolCalls) {
        const allToolCalls = [
          ...((msg as any).toolCalls || []).map((tc: any) => ({
            ...tc,
            isPartial: false,
          })),
          ...((msg as any).partialToolCalls || []).map((tc: any) => ({
            ...tc,
            isPartial: true,
          })),
        ];

        for (const tc of allToolCalls) {
          await ctx.db.insert("toolCalls", {
            messageId: msg._id,
            conversationId: msg.conversationId,
            userId: msg.userId!,
            toolCallId: tc.id,
            toolName: tc.name,
            // Parse JSON arguments (old: stringified, new: native JSON)
            args: tc.arguments ? JSON.parse(tc.arguments) : {},
            result: tc.result ? JSON.parse(tc.result) : undefined,
            textPosition: tc.textPosition,
            isPartial: tc.isPartial,
            timestamp: tc.timestamp,
            createdAt: msg.createdAt,
          });
          toolCallsCreated++;
        }
      }

      messagesProcessed++;
    }

    // Update migration progress
    await ctx.db
      .query("migrations")
      .withIndex("by_migration_id", (q) => q.eq("migrationId", MIGRATION_ID))
      .first()
      .then(async (migration) => {
        if (migration) {
          await ctx.db.patch(migration._id, {
            processedRecords: migration.processedRecords + messagesProcessed,
            checkpoint: {
              cursor: result.continueCursor,
              processedCount: migration.processedRecords + messagesProcessed,
              successCount:
                (migration.checkpoint?.successCount || 0) +
                attachmentsCreated +
                toolCallsCreated,
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
      processed: messagesProcessed,
      attachmentsCreated,
      toolCallsCreated,
    };
  },
});

// Orchestrator action - manages full migration lifecycle
export const migrate = internalAction({
  handler: async (ctx) => {
    console.log(`🚀 Starting ${MIGRATION_NAME}...`);
    console.log(`   Migration ID: ${MIGRATION_ID}`);

    const startTime = Date.now();

    // Create or resume migration record
    let migration = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.migrations["001_normalize_message_attachments"]
        .getMigrationState,
      {},
    )) as Doc<"migrations"> | null;

    if (!migration) {
      // Create new migration record
      migration = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.migrations["001_normalize_message_attachments"]
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

    // Run backfill in batches
    let cursor: string | null = migration.checkpoint?.cursor ?? null;
    let totalProcessed = migration.processedRecords || 0;
    let totalAttachments = 0;
    let totalToolCalls = 0;
    let batchCount = 0;

    do {
      const result = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.migrations["001_normalize_message_attachments"].backfillBatch,
        { cursor, batchSize: 100 },
      )) as {
        done: boolean;
        nextCursor?: string;
        processed: number;
        attachmentsCreated: number;
        toolCallsCreated: number;
      };

      cursor = result.nextCursor ?? null;
      totalProcessed += result.processed;
      totalAttachments += result.attachmentsCreated;
      totalToolCalls += result.toolCallsCreated;
      batchCount++;

      console.log(
        `   Batch ${batchCount}: ${result.processed} messages (${result.attachmentsCreated} attachments, ${result.toolCallsCreated} tool calls)`,
      );

      if (result.done) {
        // Mark migration complete
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.migrations["001_normalize_message_attachments"]
            .completeMigration,
          {
            totalAttachments,
            totalToolCalls,
          },
        );
        break;
      }
    } while (cursor);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Migration complete!`);
    console.log(`   Messages processed: ${totalProcessed}`);
    console.log(`   Attachments created: ${totalAttachments}`);
    console.log(`   Tool calls created: ${totalToolCalls}`);
    console.log(`   Batches: ${batchCount}`);
    console.log(`   Duration: ${duration}s`);
    console.log(
      `   Avg speed: ${(totalProcessed / Number.parseFloat(duration)).toFixed(1)} messages/sec`,
    );
  },
});

// Helper queries/mutations for migration state management

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
    totalAttachments: v.number(),
    totalToolCalls: v.number(),
  },
  handler: async (ctx, _args) => {
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

// Verification queries for migration data

export const verifyAttachments = internalQuery({
  handler: async (ctx) => {
    const attachments = await ctx.db.query("attachments").collect();
    return {
      count: attachments.length,
      sample: attachments.slice(0, 3),
    };
  },
});

export const verifyToolCalls = internalQuery({
  handler: async (ctx) => {
    const toolCalls = await ctx.db.query("toolCalls").collect();
    const byPartial = {
      complete: toolCalls.filter((tc) => !tc.isPartial).length,
      partial: toolCalls.filter((tc) => tc.isPartial).length,
    };
    return {
      total: toolCalls.length,
      byPartial,
      sample: toolCalls.slice(0, 3),
    };
  },
});

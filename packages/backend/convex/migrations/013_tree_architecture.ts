/**
 * Migration 013: Tree-Based Message Architecture
 *
 * Converts flat message structure to true tree structure:
 * - Convert parentMessageId → parentMessageIds (array)
 * - Set siblingIndex: 0 (all existing are single-path)
 * - Set isActiveBranch: true (all existing are active)
 * - Set rootMessageId = first message in conversation
 * - Set conversation.activeLeafMessageId = last message
 *
 * Batch processes 100 conversations per run to stay under 10min limit.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { logger } from "../lib/logger";

const MIGRATION_ID = "013_tree_architecture";
const MIGRATION_NAME = "Tree-Based Message Architecture";
const BATCH_SIZE = 100;

/**
 * Get migration status
 */
export const getStatus = internalQuery({
  args: {},
  handler: async (ctx) => {
    const migration = await ctx.db
      .query("migrations")
      .withIndex("by_migration_id", (q) => q.eq("migrationId", MIGRATION_ID))
      .first();

    return migration || null;
  },
});

/**
 * Initialize migration record
 */
export const initMigration = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("migrations")
      .withIndex("by_migration_id", (q) => q.eq("migrationId", MIGRATION_ID))
      .first();

    if (existing) {
      logger.info("Migration already exists", { migrationId: MIGRATION_ID });
      return existing._id;
    }

    // Count total conversations for progress tracking
    const allConversations = await ctx.db.query("conversations").collect();
    const totalRecords = allConversations.length;

    const now = Date.now();
    const migrationId = await ctx.db.insert("migrations", {
      migrationId: MIGRATION_ID,
      name: MIGRATION_NAME,
      phase: "backfill",
      status: "pending",
      checkpoint: {
        cursor: undefined,
        processedCount: 0,
        successCount: 0,
        errorCount: 0,
        lastProcessedId: undefined,
      },
      totalRecords,
      processedRecords: 0,
      createdAt: now,
      updatedAt: now,
    });

    logger.info("Migration initialized", {
      migrationId: MIGRATION_ID,
      totalRecords,
    });

    return migrationId;
  },
});

/**
 * Process a batch of conversations
 */
export const backfillBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || BATCH_SIZE;

    // Get migration record
    const migration = await ctx.db
      .query("migrations")
      .withIndex("by_migration_id", (q) => q.eq("migrationId", MIGRATION_ID))
      .first();

    if (!migration) {
      throw new Error("Migration not initialized");
    }

    // Mark as running
    await ctx.db.patch(migration._id, {
      status: "running",
      startedAt: migration.startedAt || Date.now(),
      updatedAt: Date.now(),
    });

    // Paginate through conversations
    const result = await ctx.db
      .query("conversations")
      .order("desc")
      .paginate({ cursor: args.cursor, numItems: batchSize });

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let lastProcessedId: string | undefined;

    for (const conversation of result.page) {
      try {
        lastProcessedId = conversation._id;

        // Get all messages for this conversation, ordered by createdAt
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation_created", (q) =>
            q.eq("conversationId", conversation._id),
          )
          .collect();

        if (messages.length === 0) {
          processedCount++;
          successCount++;
          continue;
        }

        // Sort by createdAt (should already be sorted by index)
        const sortedMessages = messages.sort(
          (a, b) => a.createdAt - b.createdAt,
        );
        const rootMessage = sortedMessages[0];
        const leafMessage = sortedMessages[sortedMessages.length - 1];

        // Update each message with tree fields
        for (let i = 0; i < sortedMessages.length; i++) {
          const msg = sortedMessages[i];

          // Skip if already migrated
          if (msg.parentMessageIds !== undefined) {
            continue;
          }

          // Convert parentMessageId to array, or use previous message
          const parentIds: Id<"messages">[] = [];
          if (msg.parentMessageId) {
            parentIds.push(msg.parentMessageId);
          } else if (i > 0) {
            // If no explicit parent, use previous message in sequence
            parentIds.push(sortedMessages[i - 1]._id);
          }

          await ctx.db.patch(msg._id, {
            parentMessageIds: parentIds.length > 0 ? parentIds : undefined,
            siblingIndex: 0, // All existing are first sibling
            isActiveBranch: true, // All existing are active
            rootMessageId: rootMessage._id,
            updatedAt: Date.now(),
          });
        }

        // Update conversation with activeLeafMessageId
        if (!conversation.activeLeafMessageId) {
          await ctx.db.patch(conversation._id, {
            activeLeafMessageId: leafMessage._id,
            branchCount: 1, // Single linear branch
            updatedAt: Date.now(),
          });
        }

        processedCount++;
        successCount++;
      } catch (error) {
        logger.error("Error processing conversation", {
          conversationId: conversation._id,
          error: error instanceof Error ? error.message : String(error),
        });
        processedCount++;
        errorCount++;
      }
    }

    // Update migration checkpoint
    const checkpoint = {
      cursor: result.continueCursor || undefined,
      processedCount:
        (migration.checkpoint?.processedCount || 0) + processedCount,
      successCount: (migration.checkpoint?.successCount || 0) + successCount,
      errorCount: (migration.checkpoint?.errorCount || 0) + errorCount,
      lastProcessedId,
    };

    const isDone = result.isDone;
    await ctx.db.patch(migration._id, {
      checkpoint,
      processedRecords: checkpoint.processedCount,
      status: isDone ? "completed" : "running",
      phase: isDone ? "complete" : "backfill",
      completedAt: isDone ? Date.now() : undefined,
      updatedAt: Date.now(),
    });

    logger.info("Batch complete", {
      migrationId: MIGRATION_ID,
      processedCount,
      successCount,
      errorCount,
      isDone,
      totalProcessed: checkpoint.processedCount,
    });

    return {
      isDone,
      cursor: result.continueCursor,
      processedCount,
      successCount,
      errorCount,
    };
  },
});

/**
 * Run migration action - orchestrates batches
 */
export const runMigration = internalAction({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args): Promise<void> => {
    // Initialize if needed
    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.migrations["013_tree_architecture"].initMigration,
      {},
    );

    // Process first batch
    const result = (await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.migrations["013_tree_architecture"].backfillBatch,
      { cursor: args.cursor || null },
    )) as {
      isDone: boolean;
      cursor: string | null;
      processedCount: number;
      successCount: number;
      errorCount: number;
    };

    // Schedule next batch if not done
    if (!result.isDone && result.cursor) {
      await ctx.scheduler.runAfter(
        100, // Small delay between batches
        internal.migrations["013_tree_architecture"].runMigration,
        { cursor: result.cursor },
      );
    }
  },
});

/**
 * Verify migration - check for any messages without tree fields
 */
export const verifyMigration = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Sample check - find messages without tree fields
    const unmigratedMessages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("isActiveBranch"), undefined))
      .take(100);

    const unmigratedConversations = await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("activeLeafMessageId"), undefined))
      .take(100);

    return {
      hasUnmigratedMessages: unmigratedMessages.length > 0,
      unmigratedMessagesSample: unmigratedMessages.slice(0, 5).map((m) => ({
        id: m._id,
        conversationId: m.conversationId,
      })),
      hasUnmigratedConversations: unmigratedConversations.length > 0,
      unmigratedConversationsSample: unmigratedConversations
        .slice(0, 5)
        .map((c) => ({
          id: c._id,
          title: c.title,
        })),
    };
  },
});

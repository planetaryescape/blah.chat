/**
 * Migration 011: Migrate Project Files to Knowledge Bank
 *
 * Moves project-linked files from files/fileChunks tables to
 * knowledgeSources/knowledgeChunks tables.
 *
 * IMPORTANT: This only migrates project files (linked via projectFiles).
 * Conversation-attached files remain in the old tables.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

const MIGRATION_ID = "011_migrate_project_files_to_kb";
const MIGRATION_NAME = "Migrate Project Files to Knowledge Bank";

/**
 * Backfill batch - processes one batch of projectFiles
 */
export const backfillBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  handler: async (ctx, { cursor, batchSize }) => {
    // Paginate through projectFiles junction table
    const result = await ctx.db
      .query("projectFiles")
      .order("desc")
      .paginate({ cursor, numItems: batchSize });

    let sourcesCreated = 0;
    let chunksCreated = 0;
    let itemsProcessed = 0;
    let skipped = 0;

    for (const projectFile of result.page) {
      itemsProcessed++;

      // Get the original file
      const file = await ctx.db.get(projectFile.fileId);
      if (!file) {
        skipped++;
        continue;
      }

      // Check if already migrated (look for matching knowledgeSource)
      const existingSource = await ctx.db
        .query("knowledgeSources")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", projectFile.userId).eq("projectId", projectFile.projectId),
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("storageId"), file.storageId),
            q.eq(q.field("type"), "file"),
          ),
        )
        .first();

      if (existingSource) {
        skipped++;
        continue;
      }

      // Create knowledgeSource entry
      const now = Date.now();
      const sourceId = await ctx.db.insert("knowledgeSources", {
        userId: file.userId,
        projectId: projectFile.projectId,
        type: "file",
        title: file.name,
        storageId: file.storageId,
        mimeType: file.mimeType,
        size: file.size,
        status: file.embeddingStatus === "completed" ? "completed" : "pending",
        error: file.embeddingError,
        chunkCount: file.chunkCount,
        processedAt: file.processedAt,
        createdAt: file.createdAt,
        updatedAt: now,
      });
      sourcesCreated++;

      // Migrate existing fileChunks if file was already processed
      if (file.embeddingStatus === "completed") {
        const chunks = await ctx.db
          .query("fileChunks")
          .withIndex("by_file", (q) => q.eq("fileId", file._id))
          .collect();

        for (const chunk of chunks) {
          await ctx.db.insert("knowledgeChunks", {
            sourceId,
            userId: file.userId,
            projectId: projectFile.projectId,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            charOffset: chunk.charOffset,
            tokenCount: chunk.tokenCount,
            pageNumber: chunk.startPage,
            embedding: chunk.embedding,
            createdAt: chunk.createdAt,
          });
          chunksCreated++;
        }
      }
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
            (migration.checkpoint?.successCount || 0) + sourcesCreated,
          errorCount: (migration.checkpoint?.errorCount || 0),
          lastProcessedId: result.page[result.page.length - 1]?._id,
        },
        updatedAt: Date.now(),
      });
    }

    return {
      done: result.isDone,
      nextCursor: result.continueCursor,
      processed: itemsProcessed,
      sourcesCreated,
      chunksCreated,
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

    const startTime = Date.now();

    // Create or resume migration record
    let migration = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.migrations["011_migrate_project_files_to_kb"].getMigrationState,
      {},
    )) as Doc<"migrations"> | null;

    if (!migration) {
      migration = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.migrations["011_migrate_project_files_to_kb"]
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
    let totalSources = 0;
    let totalChunks = 0;
    let totalSkipped = 0;
    let batchCount = 0;

    do {
      const result = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.migrations["011_migrate_project_files_to_kb"].backfillBatch,
        { cursor, batchSize: 50 },
      )) as {
        done: boolean;
        nextCursor?: string;
        processed: number;
        sourcesCreated: number;
        chunksCreated: number;
        skipped: number;
      };

      cursor = result.nextCursor ?? null;
      totalProcessed += result.processed;
      totalSources += result.sourcesCreated;
      totalChunks += result.chunksCreated;
      totalSkipped += result.skipped;
      batchCount++;

      console.log(
        `   Batch ${batchCount}: ${result.processed} items (${result.sourcesCreated} sources, ${result.chunksCreated} chunks, ${result.skipped} skipped)`,
      );

      if (result.done) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.migrations["011_migrate_project_files_to_kb"]
            .completeMigration,
          { totalSources, totalChunks, totalSkipped },
        );
        break;
      }
    } while (cursor);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Migration complete!`);
    console.log(`   Project files processed: ${totalProcessed}`);
    console.log(`   Knowledge sources created: ${totalSources}`);
    console.log(`   Knowledge chunks created: ${totalChunks}`);
    console.log(`   Skipped (already migrated): ${totalSkipped}`);
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
    totalSources: v.number(),
    totalChunks: v.number(),
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

// Verification

export const verify = internalQuery({
  handler: async (ctx) => {
    const sources = await ctx.db
      .query("knowledgeSources")
      .filter((q) => q.eq(q.field("type"), "file"))
      .collect();

    const projectScoped = sources.filter((s) => s.projectId !== undefined);

    const chunks = await ctx.db.query("knowledgeChunks").collect();

    return {
      totalSources: sources.length,
      projectScopedSources: projectScoped.length,
      totalChunks: chunks.length,
      sampleSources: sources.slice(0, 3).map((s) => ({
        id: s._id,
        title: s.title,
        projectId: s.projectId,
        status: s.status,
      })),
    };
  },
});

// Phase 2: Migration Actions (Node.js runtime for crypto)
"use node";

import type { Doc } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

const MIGRATION_ID = "002_normalize_message_sources";
const MIGRATION_NAME = "Phase 2: Message Sources & Metadata";

// Orchestrator action for Phase 1 (metadata backfill)
export const migrateMetadata = internalAction({
  handler: async (ctx) => {
    console.log(`🚀 Starting ${MIGRATION_NAME} - Phase 1: Metadata Backfill`);
    console.log(`   Migration ID: ${MIGRATION_ID}`);

    const startTime = Date.now();

    // Create or resume migration record
    let migration = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.migrations["002_normalize_message_sources"].getMigrationState,
      {},
    )) as Doc<"migrations"> | null;

    if (!migration) {
      migration = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.migrations["002_normalize_message_sources"]
          .initializeMigration,
        { phase: "metadata" },
      )) as Doc<"migrations">;
      console.log("✅ Migration initialized (Phase 1: Metadata)");
    } else if (migration.status === "completed") {
      console.log("⚠️  Migration already completed");
      return;
    } else {
      console.log(`🔄 Resuming migration from cursor...`);
    }

    // URL hash generation (Node.js crypto available here)
    const crypto = await import("node:crypto");
    const generateUrlHash = (url: string): string => {
      try {
        const parsed = new URL(url);
        parsed.hostname = parsed.hostname.toLowerCase();
        if (parsed.pathname.endsWith("/") && parsed.pathname.length > 1) {
          parsed.pathname = parsed.pathname.slice(0, -1);
        }
        const normalized = parsed.href;
        return crypto
          .createHash("sha256")
          .update(normalized)
          .digest("hex")
          .substring(0, 16);
      } catch {
        return crypto
          .createHash("sha256")
          .update(url)
          .digest("hex")
          .substring(0, 16);
      }
    };

    // Run backfill in batches
    let cursor: string | null = migration.checkpoint?.cursor ?? null;
    let totalProcessed = migration.processedRecords || 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let batchCount = 0;

    do {
      // Fetch batch to extract URLs
      const messages = (await (ctx.runQuery as any)(
        // @ts-ignore
        internal.migrations["002_normalize_message_sources"].fetchMessageBatch,
        { cursor, batchSize: 100 },
      )) as {
        messages: Array<{
          _id: string;
          sources?: Array<{ id: string; url: string }>;
          sourceMetadata?: Array<{ sourceId: string }>;
          model?: string;
        }>;
        done: boolean;
        nextCursor?: string;
      };

      // Extract unique URLs and compute hashes in Node
      const urls = new Set<string>();
      for (const msg of messages.messages) {
        if (msg.sources) {
          for (const src of msg.sources) {
            urls.add(src.url);
          }
        }
        if (msg.sourceMetadata) {
          const sources = msg.sources || [];
          for (const meta of msg.sourceMetadata) {
            const matchingSource = sources.find((s) => s.id === meta.sourceId);
            if (matchingSource?.url) {
              urls.add(matchingSource.url);
            }
          }
        }
      }

      const urlHashes = Array.from(urls).map((url) => ({
        url,
        urlHash: generateUrlHash(url),
      }));

      // Call mutation with pre-computed hashes
      const result = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.migrations["002_normalize_message_sources"]
          .backfillSourceMetadataBatch,
        { cursor, batchSize: 100, urlHashes },
      )) as {
        done: boolean;
        nextCursor?: string;
        processed: number;
        metadataCreated: number;
        metadataUpdated: number;
      };

      cursor = result.nextCursor ?? null;
      totalProcessed += result.processed;
      totalCreated += result.metadataCreated;
      totalUpdated += result.metadataUpdated;
      batchCount++;

      console.log(
        `   Batch ${batchCount}: ${result.processed} messages (${result.metadataCreated} created, ${result.metadataUpdated} updated)`,
      );

      if (result.done) {
        break;
      }
    } while (cursor);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Phase 1 complete!`);
    console.log(`   Messages processed: ${totalProcessed}`);
    console.log(`   Metadata created: ${totalCreated}`);
    console.log(`   Metadata updated: ${totalUpdated}`);
    console.log(`   Batches: ${batchCount}`);
    console.log(`   Duration: ${duration}s`);
  },
});

// Orchestrator action for Phase 2 (sources backfill)
export const migrateSources = internalAction({
  handler: async (ctx) => {
    console.log(`🚀 Starting ${MIGRATION_NAME} - Phase 2: Sources Backfill`);
    console.log(`   Migration ID: ${MIGRATION_ID}`);

    const startTime = Date.now();

    // Get migration record
    let migration = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.migrations["002_normalize_message_sources"].getMigrationState,
      {},
    )) as Doc<"migrations"> | null;

    if (!migration) {
      throw new Error("Migration not initialized. Run migrateMetadata first.");
    }

    // Reset checkpoint for phase 2
    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.migrations["002_normalize_message_sources"].resetCheckpoint,
      { phase: "sources" },
    );

    // URL hash generation (Node.js crypto available here)
    const crypto = await import("node:crypto");
    const generateUrlHash = (url: string): string => {
      try {
        const parsed = new URL(url);
        parsed.hostname = parsed.hostname.toLowerCase();
        if (parsed.pathname.endsWith("/") && parsed.pathname.length > 1) {
          parsed.pathname = parsed.pathname.slice(0, -1);
        }
        const normalized = parsed.href;
        return crypto
          .createHash("sha256")
          .update(normalized)
          .digest("hex")
          .substring(0, 16);
      } catch {
        return crypto
          .createHash("sha256")
          .update(url)
          .digest("hex")
          .substring(0, 16);
      }
    };

    // Run backfill in batches
    let cursor: string | null = null;
    let totalProcessed = 0;
    let totalSources = 0;
    let batchCount = 0;

    do {
      // Fetch batch to extract URLs
      const messages = (await (ctx.runQuery as any)(
        // @ts-ignore
        internal.migrations["002_normalize_message_sources"].fetchMessageBatch,
        { cursor, batchSize: 100 },
      )) as {
        messages: Array<{
          _id: string;
          sources?: Array<{ id: string; url: string }>;
          sourceMetadata?: Array<{ sourceId: string }>;
          model?: string;
        }>;
        done: boolean;
        nextCursor?: string;
      };

      // Extract unique URLs and compute hashes
      const urls = new Set<string>();
      for (const msg of messages.messages) {
        if (msg.sources) {
          for (const src of msg.sources) {
            urls.add(src.url);
          }
        }
      }

      const urlHashes = Array.from(urls).map((url) => ({
        url,
        urlHash: generateUrlHash(url),
      }));

      // Call mutation with pre-computed hashes
      const result = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.migrations["002_normalize_message_sources"]
          .backfillSourcesBatch,
        { cursor, batchSize: 100, urlHashes },
      )) as {
        done: boolean;
        nextCursor?: string;
        processed: number;
        sourcesCreated: number;
      };

      cursor = result.nextCursor ?? null;
      totalProcessed += result.processed;
      totalSources += result.sourcesCreated;
      batchCount++;

      console.log(
        `   Batch ${batchCount}: ${result.processed} messages (${result.sourcesCreated} sources)`,
      );

      if (result.done) {
        // Mark migration complete
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.migrations["002_normalize_message_sources"]
            .completeMigration,
          { totalSources },
        );
        break;
      }
    } while (cursor);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Phase 2 complete!`);
    console.log(`   Messages processed: ${totalProcessed}`);
    console.log(`   Sources created: ${totalSources}`);
    console.log(`   Batches: ${batchCount}`);
    console.log(`   Duration: ${duration}s`);
  },
});

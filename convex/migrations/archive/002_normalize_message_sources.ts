// Phase 2: Normalize Message Sources & Metadata
// Extracts nested source arrays to separate tables with URL-based deduplication

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";

const MIGRATION_ID = "002_normalize_message_sources";
const MIGRATION_NAME = "Phase 2: Message Sources & Metadata";

// Phase 1: Backfill sourceMetadata (deduplicated by URL hash)
export const backfillSourceMetadataBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
    urlHashes: v.array(
      v.object({
        url: v.string(),
        urlHash: v.string(),
      }),
    ),
  },
  handler: async (ctx, { cursor, batchSize, urlHashes }) => {
    // Build URL hash lookup map (pre-computed by action)
    const hashMap = new Map(urlHashes.map((h) => [h.url, h.urlHash]));

    // Paginate through messages
    const result = await ctx.db
      .query("messages")
      .order("desc")
      .paginate({ cursor, numItems: batchSize });

    let metadataCreated = 0;
    let metadataUpdated = 0;
    const urlMap = new Map<
      string,
      {
        url: string;
        urlHash: string;
        enriched: boolean;
        metadata?: {
          title?: string;
          description?: string;
          ogImage?: string;
          favicon?: string;
          siteName?: string;
        };
      }
    >();

    for (const msg of result.page) {
      // Extract from sources array
      if (msg.sources) {
        for (const src of msg.sources as Array<{
          id: string;
          title: string;
          url: string;
          snippet?: string;
          publishedDate?: string;
        }>) {
          if (src.url && !urlMap.has(src.url)) {
            const urlHash = hashMap.get(src.url);
            if (urlHash) {
              urlMap.set(src.url, {
                url: src.url,
                urlHash,
                enriched: false,
              });
            }
          }
        }
      }

      // Extract from sourceMetadata array (enriched data)
      if (msg.sourceMetadata) {
        for (const meta of msg.sourceMetadata as Array<{
          sourceId: string;
          ogTitle?: string;
          ogDescription?: string;
          ogImage?: string;
          favicon?: string;
          domain: string;
          fetchedAt?: number;
          error?: string;
        }>) {
          // Find matching URL from sources array
          const matchingSource = (
            msg.sources as Array<{ id: string; url: string }> | undefined
          )?.find((s) => s.id === meta.sourceId);

          if (matchingSource?.url) {
            const urlHash = hashMap.get(matchingSource.url);
            if (urlHash) {
              const existing = urlMap.get(matchingSource.url);
              urlMap.set(matchingSource.url, {
                url: matchingSource.url,
                urlHash,
                enriched: !meta.error, // only if no error
                metadata: meta.error
                  ? existing?.metadata
                  : {
                      title: meta.ogTitle,
                      description: meta.ogDescription,
                      ogImage: meta.ogImage,
                      favicon: meta.favicon,
                      siteName: undefined, // old schema didn't have siteName
                    },
              });
            }
          }
        }
      }
    }

    // Insert into sourceMetadata (skip if exists)
    for (const [url, data] of urlMap) {
      const existing = await ctx.db
        .query("sourceMetadata")
        .withIndex("by_urlHash", (q) => q.eq("urlHash", data.urlHash))
        .first();

      if (!existing) {
        await ctx.db.insert("sourceMetadata", {
          urlHash: data.urlHash,
          url: data.url,
          enriched: data.enriched,
          enrichedAt: data.enriched ? Date.now() : undefined,
          title: data.metadata?.title,
          description: data.metadata?.description,
          ogImage: data.metadata?.ogImage,
          favicon: data.metadata?.favicon,
          siteName: data.metadata?.siteName,
          firstSeenAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 0, // will be updated in phase 2
        });
        metadataCreated++;
      } else if (data.enriched && !existing.enriched) {
        // Update with enriched metadata if we have it
        await ctx.db.patch(existing._id, {
          enriched: true,
          enrichedAt: Date.now(),
          title: data.metadata?.title,
          description: data.metadata?.description,
          ogImage: data.metadata?.ogImage,
          favicon: data.metadata?.favicon,
          siteName: data.metadata?.siteName,
        });
        metadataUpdated++;
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
                (migration.checkpoint?.successCount || 0) +
                metadataCreated +
                metadataUpdated,
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
      metadataCreated,
      metadataUpdated,
    };
  },
});

// Phase 2: Backfill sources (per-message references)
export const backfillSourcesBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
    urlHashes: v.array(
      v.object({
        url: v.string(),
        urlHash: v.string(),
      }),
    ),
  },
  handler: async (ctx, { cursor, batchSize, urlHashes }) => {
    // Build URL hash lookup map
    const hashMap = new Map(urlHashes.map((h) => [h.url, h.urlHash]));

    // Paginate through messages
    const result = await ctx.db
      .query("messages")
      .order("desc")
      .paginate({ cursor, numItems: batchSize });

    let sourcesCreated = 0;
    let messagesProcessed = 0;

    for (const msg of result.page) {
      // Skip if no sources
      if (!msg.sources || msg.sources.length === 0) {
        messagesProcessed++;
        continue;
      }

      // Skip if already migrated (idempotent)
      const existingSources = await ctx.db
        .query("sources")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .first();

      if (existingSources) {
        messagesProcessed++;
        continue;
      }

      // Determine provider from model
      const provider = msg.model?.startsWith("openrouter/")
        ? "openrouter"
        : msg.model?.startsWith("perplexity/")
          ? "perplexity"
          : "generic";

      // Insert sources
      for (const src of msg.sources as Array<{
        id: string;
        title: string;
        url: string;
        snippet?: string;
        publishedDate?: string;
      }>) {
        if (!src.url) continue;

        const urlHash = hashMap.get(src.url);
        if (!urlHash) {
          console.warn(`Missing hash for URL ${src.url} in message ${msg._id}`);
          continue;
        }

        // Verify sourceMetadata exists
        const metadata = await ctx.db
          .query("sourceMetadata")
          .withIndex("by_urlHash", (q) => q.eq("urlHash", urlHash))
          .first();

        if (!metadata) {
          console.warn(
            `Missing metadata for URL ${src.url} in message ${msg._id}`,
          );
          continue;
        }

        // Insert source record
        await ctx.db.insert("sources", {
          messageId: msg._id,
          conversationId: msg.conversationId,
          userId: msg.userId!,
          position: Number.parseInt(src.id) || 0, // "1" -> 1
          provider,
          title: src.title,
          snippet: src.snippet,
          urlHash,
          url: src.url,
          isPartial: false, // old messages never had partial sources
          createdAt: msg.createdAt,
        });

        // Increment accessCount
        await ctx.db.patch(metadata._id, {
          accessCount: (metadata.accessCount || 0) + 1,
          lastAccessedAt: Date.now(),
        });

        sourcesCreated++;
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
                (migration.checkpoint?.successCount || 0) + sourcesCreated,
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
      sourcesCreated,
    };
  },
});

// Helper queries/mutations for migration state management
// Actions are in 002_normalize_message_sources_actions.ts (Node.js runtime)

export const fetchMessageBatch = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  handler: async (ctx, { cursor, batchSize }) => {
    const result = await ctx.db
      .query("messages")
      .order("desc")
      .paginate({ cursor, numItems: batchSize });

    return {
      messages: result.page.map((msg) => ({
        _id: msg._id,
        sources: msg.sources,
        sourceMetadata: msg.sourceMetadata,
        model: msg.model,
      })),
      done: result.isDone,
      nextCursor: result.continueCursor,
    };
  },
});

export const getMigrationState = internalQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("migrations")
      .withIndex("by_migration_id", (q) => q.eq("migrationId", MIGRATION_ID))
      .first();
  },
});

export const initializeMigration = internalMutation({
  args: {
    phase: v.string(),
  },
  handler: async (ctx, { phase }) => {
    const id = await ctx.db.insert("migrations", {
      migrationId: MIGRATION_ID,
      name: `${MIGRATION_NAME} - ${phase}`,
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

export const resetCheckpoint = internalMutation({
  args: {
    phase: v.string(),
  },
  handler: async (ctx, { phase }) => {
    const migration = await ctx.db
      .query("migrations")
      .withIndex("by_migration_id", (q) => q.eq("migrationId", MIGRATION_ID))
      .first();

    if (migration) {
      await ctx.db.patch(migration._id, {
        name: `${MIGRATION_NAME} - ${phase}`,
        processedRecords: 0,
        checkpoint: {
          cursor: undefined,
          processedCount: 0,
          successCount: 0,
          errorCount: 0,
        },
        updatedAt: Date.now(),
      });
    }
  },
});

export const completeMigration = internalMutation({
  args: {
    totalSources: v.number(),
  },
  handler: async (ctx, { totalSources }) => {
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

// Verification queries

export const verifyDeduplication = internalQuery({
  handler: async (ctx) => {
    const sources = await ctx.db.query("sources").collect();
    const metadata = await ctx.db.query("sourceMetadata").collect();

    const uniqueUrls = new Set(sources.map((s) => s.url)).size;

    return {
      totalSources: sources.length,
      uniqueUrls,
      metadataCount: metadata.length,
      deduplicationRatio:
        ((1 - metadata.length / sources.length) * 100).toFixed(1) + "%",
      avgAccessCount:
        (
          metadata.reduce((sum, m) => sum + m.accessCount, 0) / metadata.length
        ).toFixed(2),
    };
  },
});

export const verifySources = internalQuery({
  handler: async (ctx) => {
    const sources = await ctx.db.query("sources").collect();
    return {
      total: sources.length,
      byProvider: {
        openrouter: sources.filter((s) => s.provider === "openrouter").length,
        perplexity: sources.filter((s) => s.provider === "perplexity").length,
        generic: sources.filter((s) => s.provider === "generic").length,
      },
      sample: sources.slice(0, 3),
    };
  },
});

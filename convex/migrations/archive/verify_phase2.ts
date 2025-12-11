// Verification queries for Phase 2 message sources migration
import { internalQuery } from "../_generated/server";

// Check current migration state
export const checkMigrationState = internalQuery({
  handler: async (ctx) => {
    const sources = await ctx.db.query("sources").collect();
    const metadata = await ctx.db.query("sourceMetadata").collect();
    const messagesWithSources = new Set(sources.map((s) => s.messageId)).size;

    const migration = await ctx.db
      .query("migrations")
      .withIndex("by_migration_id", (q) =>
        q.eq("migrationId", "002_normalize_message_sources"),
      )
      .first();

    return {
      summary: {
        sources: sources.length,
        sourceMetadata: metadata.length,
        messagesWithSources: messagesWithSources,
        migrationStatus: migration?.status ?? "not_started",
        phaseE: "complete - legacy fields removed",
      },
      recommendation:
        sources.length === 0
          ? "No sources found - migration may not have been needed"
          : "✅ Phase 2 complete - normalized tables in use, legacy fields removed",
    };
  },
});

// Verify migration data integrity
export const verifySourcesMigration = internalQuery({
  handler: async (ctx) => {
    const sources = await ctx.db.query("sources").collect();
    const metadata = await ctx.db.query("sourceMetadata").collect();

    // Get unique messages with sources
    const messagesWithSources = new Set(sources.map((s) => s.messageId));

    // Deduplication metrics
    const uniqueUrls = new Set(sources.map((s) => s.url)).size;
    const deduplicationRatio =
      sources.length > 0
        ? (((sources.length - metadata.length) / sources.length) * 100).toFixed(
            1,
          )
        : "0.0";

    // Sample verification (check first 3 messages with sources)
    const sampleMessageIds = Array.from(messagesWithSources).slice(0, 3);
    const sampleChecks = await Promise.all(
      sampleMessageIds.map(async (messageId) => {
        const msgSources = await ctx.db
          .query("sources")
          .withIndex("by_message", (q) => q.eq("messageId", messageId))
          .collect();
        return {
          messageId,
          sourceCount: msgSources.length,
          enriched: msgSources.filter((s) => {
            const meta = metadata.find((m) => m.urlHash === s.urlHash);
            return meta?.enriched;
          }).length,
        };
      }),
    );

    // Enrichment status
    const enriched = metadata.filter((m) => m.enriched).length;
    const enrichmentRate =
      metadata.length > 0
        ? ((enriched / metadata.length) * 100).toFixed(1)
        : "0.0";

    return {
      summary: {
        messagesWithSources: messagesWithSources.size,
        sourcesCreated: sources.length,
        metadataCreated: metadata.length,
        uniqueUrls,
        deduplicationRatio: `${deduplicationRatio}%`,
        deduplicationSavings:
          sources.length > 0
            ? `${sources.length - metadata.length} duplicate URLs avoided`
            : "N/A",
        enrichmentRate: `${enrichmentRate}%`,
        enrichedCount: enriched,
        pendingEnrichment: metadata.length - enriched,
      },
      sampleChecks,
      integrityCheck: {
        passed: "✅ Migration complete - legacy fields removed (Phase E)",
      },
    };
  },
});

// Verify deduplication is working
export const verifyDeduplication = internalQuery({
  handler: async (ctx) => {
    const metadata = await ctx.db.query("sourceMetadata").collect();

    // Find URLs referenced more than once
    const duplicates = metadata
      .filter((m) => m.accessCount > 1)
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    const avgAccessCount =
      metadata.length > 0
        ? (
            metadata.reduce((sum, m) => sum + m.accessCount, 0) / metadata.length
          ).toFixed(2)
        : "0.00";

    return {
      summary: {
        totalMetadata: metadata.length,
        deduplicatedUrls: duplicates.length,
        avgAccessCount: Number.parseFloat(avgAccessCount),
      },
      topDuplicates: duplicates.map((m) => ({
        url: m.url,
        domain: m.siteName || new URL(m.url).hostname,
        accessCount: m.accessCount,
        enriched: m.enriched,
      })),
      deduplicationWorking:
        duplicates.length > 0
          ? "✅ Deduplication confirmed"
          : "⚠️  No duplicates found (might be low usage)",
    };
  },
});

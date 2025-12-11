/**
 * Tag Migrations
 *
 * Administrative utilities for backfilling embeddings and optimizing tag data.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction, internalQuery } from "../_generated/server";

/**
 * Backfill embeddings for existing tags
 *
 * Strategy: Generate embeddings for popular tags (usageCount > 5) first
 * to maximize impact. Less-used tags will get embeddings lazily on first match.
 *
 * Usage: Call manually from Convex dashboard or CLI
 * npx convex run tags/migrations:backfillTagEmbeddings
 */
export const backfillTagEmbeddings = internalAction({
  args: {
    minUsageCount: v.optional(v.number()), // Only tags with usageCount >= this (default: 5)
    maxTags: v.optional(v.number()), // Limit number of tags to process (default: 100)
    dryRun: v.optional(v.boolean()), // Preview without generating (default: false)
  },
  handler: async (ctx, args) => {
    const minUsageCount = args.minUsageCount ?? 5;
    const maxTags = args.maxTags ?? 100;
    const dryRun = args.dryRun ?? false;

    console.log(`[Backfill] Starting tag embedding backfill...`);
    console.log(`  Min usage count: ${minUsageCount}`);
    console.log(`  Max tags: ${maxTags}`);
    console.log(`  Dry run: ${dryRun}`);

    // Get all tags that need embeddings
    const tagsNeedingEmbeddings = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.tags.migrations.getTagsNeedingEmbeddings,
      { minUsageCount, maxTags },
    )) as Doc<"tags">[];

    console.log(`[Backfill] Found ${tagsNeedingEmbeddings.length} tags needing embeddings`);

    if (tagsNeedingEmbeddings.length === 0) {
      return {
        success: true,
        processed: 0,
        message: "No tags need embeddings",
      };
    }

    if (dryRun) {
      console.log(`[Backfill] DRY RUN - Would process ${tagsNeedingEmbeddings.length} tags:`);
      for (const tag of tagsNeedingEmbeddings.slice(0, 10)) {
        console.log(`  - "${tag.displayName}" (usage: ${tag.usageCount})`);
      }
      if (tagsNeedingEmbeddings.length > 10) {
        console.log(`  ... and ${tagsNeedingEmbeddings.length - 10} more`);
      }
      return {
        success: true,
        processed: 0,
        preview: tagsNeedingEmbeddings.length,
        dryRun: true,
      };
    }

    // Generate embeddings in batches (avoid overwhelming the system)
    let processed = 0;
    let failed = 0;
    const batchSize = 10;

    for (let i = 0; i < tagsNeedingEmbeddings.length; i += batchSize) {
      const batch = tagsNeedingEmbeddings.slice(i, i + batchSize);

      console.log(
        `[Backfill] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tagsNeedingEmbeddings.length / batchSize)}...`,
      );

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map((tag) =>
          (ctx.runAction as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.tags.embeddings.generateTagEmbedding,
            { tagId: tag._id },
          ),
        ),
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          processed++;
        } else {
          failed++;
          console.error(`[Backfill] Failed to process tag:`, result.reason);
        }
      }

      // Small delay between batches to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`[Backfill] Complete! Processed: ${processed}, Failed: ${failed}`);

    return {
      success: true,
      processed,
      failed,
      total: tagsNeedingEmbeddings.length,
    };
  },
});

/**
 * Internal query to get tags that need embeddings
 */
export const getTagsNeedingEmbeddings = internalQuery({
  args: {
    minUsageCount: v.number(),
    maxTags: v.number(),
  },
  handler: async (ctx, { minUsageCount, maxTags }) => {
    // Get all tags without embeddings, sorted by usage (most popular first)
    const allTags = await ctx.db.query("tags").collect();

    const tagsNeedingEmbeddings = allTags
      .filter((tag) => {
        // Skip if already has embedding
        if (tag.embedding && tag.embedding.length > 0) {
          return false;
        }
        // Only include if meets minimum usage threshold
        return tag.usageCount >= minUsageCount;
      })
      .sort((a, b) => b.usageCount - a.usageCount) // Most popular first
      .slice(0, maxTags);

    return tagsNeedingEmbeddings;
  },
});

/**
 * Get tag statistics for monitoring
 */
export const getTagStatistics = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allTags = await ctx.db.query("tags").collect();

    const withEmbeddings = allTags.filter(
      (t) => t.embedding && t.embedding.length > 0,
    ).length;
    const withoutEmbeddings = allTags.length - withEmbeddings;

    const byUsage = {
      unused: allTags.filter((t) => t.usageCount === 0).length,
      lowUsage: allTags.filter((t) => t.usageCount > 0 && t.usageCount < 5).length,
      mediumUsage: allTags.filter((t) => t.usageCount >= 5 && t.usageCount < 20).length,
      highUsage: allTags.filter((t) => t.usageCount >= 20).length,
    };

    return {
      total: allTags.length,
      withEmbeddings,
      withoutEmbeddings,
      embeddingCoverage: allTags.length > 0 ? (withEmbeddings / allTags.length) * 100 : 0,
      byUsage,
    };
  },
});

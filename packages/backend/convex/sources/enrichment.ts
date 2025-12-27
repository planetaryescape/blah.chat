// Source Enrichment - Mutations (V8 runtime)

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Update sourceMetadata records with enriched OpenGraph data
 */
export const updateSourceMetadataBatch = internalMutation({
  args: {
    enrichedData: v.array(
      v.object({
        urlHash: v.string(),
        url: v.string(),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        ogImage: v.optional(v.string()),
        favicon: v.optional(v.string()),
        siteName: v.optional(v.string()),
        enriched: v.boolean(),
        error: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { enrichedData }) => {
    for (const data of enrichedData) {
      // Find existing sourceMetadata record
      const existing = await ctx.db
        .query("sourceMetadata")
        .withIndex("by_urlHash", (q) => q.eq("urlHash", data.urlHash))
        .first();

      if (existing) {
        // Update with enriched metadata
        await ctx.db.patch(existing._id, {
          enriched: data.enriched,
          enrichedAt: data.enriched ? Date.now() : undefined,
          title: data.title,
          description: data.description,
          ogImage: data.ogImage,
          favicon: data.favicon,
          siteName: data.siteName,
          enrichmentError: data.error,
        });
      } else {
        console.warn(
          `[Enrichment] sourceMetadata not found for urlHash ${data.urlHash}`,
        );
      }
    }
  },
});

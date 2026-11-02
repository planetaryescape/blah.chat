// Source Operations - Mutations and Queries (V8 runtime)

import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";

/**
 * Insert sources with pre-computed URL hashes.
 * Called by addSources action after hash generation.
 */
export const insertSourcesWithHashes = internalMutation({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    provider: v.string(),
    sources: v.array(
      v.object({
        position: v.number(),
        title: v.string(),
        url: v.string(),
        snippet: v.optional(v.string()),
        urlHash: v.string(), // Pre-computed by action
      }),
    ),
  },
  handler: async (ctx, args) => {
    let metadataCreated = 0;
    let sourcesCreated = 0;
    const unenrichedUrls: string[] = [];

    for (const src of args.sources) {
      // 1. Check if sourceMetadata exists
      let metadata = await ctx.db
        .query("sourceMetadata")
        .withIndex("by_urlHash", (q) => q.eq("urlHash", src.urlHash))
        .first();

      // 2. Create sourceMetadata if not exists
      if (!metadata) {
        const metadataId = await ctx.db.insert("sourceMetadata", {
          urlHash: src.urlHash,
          url: src.url,
          enriched: false,
          firstSeenAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 0,
        });
        metadata = await ctx.db.get(metadataId);
        metadataCreated++;
        unenrichedUrls.push(src.url);
      } else if (!metadata.enriched) {
        // Track unenriched URLs for async enrichment
        unenrichedUrls.push(src.url);
      }

      // 3. Insert source record
      await ctx.db.insert("sources", {
        messageId: args.messageId,
        conversationId: args.conversationId,
        userId: args.userId,
        position: src.position,
        provider: args.provider,
        title: src.title,
        snippet: src.snippet,
        urlHash: src.urlHash,
        url: src.url,
        isPartial: false,
        createdAt: Date.now(),
      });
      sourcesCreated++;

      // 4. Increment accessCount
      if (metadata) {
        await ctx.db.patch(metadata._id, {
          accessCount: (metadata.accessCount || 0) + 1,
          lastAccessedAt: Date.now(),
        });
      }
    }

    return { metadataCreated, sourcesCreated, unenrichedUrls };
  },
});

/**
 * Get sources for a message with joined metadata.
 * Returns sources sorted by position for [1], [2], [3] citation markers.
 */
export const getSources = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, { messageId }) => {
    // Fetch all sources for this message
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_message", (q) => q.eq("messageId", messageId))
      .collect();

    // Join with sourceMetadata
    const sourcesWithMetadata = await Promise.all(
      sources.map(async (src) => {
        const metadata = await ctx.db
          .query("sourceMetadata")
          .withIndex("by_urlHash", (q) => q.eq("urlHash", src.urlHash))
          .first();

        return {
          // Source-specific data
          position: src.position,
          provider: src.provider,
          title: src.title,
          snippet: src.snippet,
          url: src.url,
          isPartial: src.isPartial,
          createdAt: src.createdAt,

          // Joined metadata (OG data)
          metadata: metadata
            ? {
                title: metadata.title,
                description: metadata.description,
                ogImage: metadata.ogImage,
                favicon: metadata.favicon,
                siteName: metadata.siteName,
                enriched: metadata.enriched,
              }
            : null,
        };
      }),
    );

    // Sort by position for proper [1], [2], [3] ordering
    return sourcesWithMetadata.sort((a, b) => a.position - b.position);
  },
});

/**
 * Get all sources for a conversation.
 * Used for copying entire conversation with sources.
 */
export const getByConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { conversationId }) => {
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();

    return sources.map((src) => ({
      messageId: src.messageId,
      position: src.position,
      title: src.title,
      url: src.url,
    }));
  },
});

/**
 * Get sources with fallback to legacy message.sources[] field.
 * Fixes race condition where normalized table hasn't been populated yet.
 * Returns: { sources, source: "normalized" | "legacy" | "none" }
 */
export const getSourcesWithFallback = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, { messageId }) => {
    // 1. Try normalized table first (enriched with metadata)
    const normalizedSources = await ctx.db
      .query("sources")
      .withIndex("by_message", (q) => q.eq("messageId", messageId))
      .collect();

    if (normalizedSources.length > 0) {
      // Join with sourceMetadata
      const sourcesWithMetadata = await Promise.all(
        normalizedSources.map(async (src) => {
          const metadata = await ctx.db
            .query("sourceMetadata")
            .withIndex("by_urlHash", (q) => q.eq("urlHash", src.urlHash))
            .first();

          return {
            position: src.position,
            provider: src.provider,
            title: src.title,
            snippet: src.snippet,
            url: src.url,
            isPartial: src.isPartial,
            createdAt: src.createdAt,
            metadata: metadata
              ? {
                  title: metadata.title,
                  description: metadata.description,
                  ogImage: metadata.ogImage,
                  favicon: metadata.favicon,
                  siteName: metadata.siteName,
                  enriched: metadata.enriched,
                }
              : null,
          };
        }),
      );

      return {
        sources: sourcesWithMetadata.sort((a, b) => a.position - b.position),
        source: "normalized" as const,
      };
    }

    // 2. No sources found (legacy fallback removed - Phase 2 migration complete)
    return { sources: [], source: "none" as const };
  },
});

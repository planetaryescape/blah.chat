import { embed } from "ai";
import { v } from "convex/values";
import { EMBEDDING_MODEL } from "@/lib/ai/operational-models";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action, query } from "../_generated/server";
import { logger } from "../lib/logger";
import { getCurrentUser } from "../lib/userSync";
import { applyRRF } from "../lib/utils/search";

// Relevance thresholds - balanced for semantic search
const VECTOR_SIMILARITY_THRESHOLD = 0.55; // Cosine similarity threshold (text-embedding-3-small typically: 0.5-0.8)
const MIN_RRF_SCORE = 0.004; // Minimum RRF score (k=60: rank 1 = 0.016, rank 20 = 0.012, rank 50 = 0.009)

/**
 * Hybrid search for presentations using RRF (Reciprocal Rank Fusion)
 * Combines full-text (title) + vector (embedding) search
 * Applies strict relevance thresholds to filter low-quality matches
 */
export const hybridSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    filter: v.optional(
      v.union(v.literal("all"), v.literal("starred"), v.literal("pinned")),
    ),
  },
  handler: async (ctx, args): Promise<Doc<"presentations">[]> => {
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getCurrentUser,
      {},
    )) as Doc<"users"> | null;
    if (!user) return [];

    const limit = args.limit || 20;

    // Check admin settings for hybrid search
    const adminSettings = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      api.adminSettings.get,
      {},
    )) as { enableHybridSearch?: boolean } | null;
    const hybridSearchEnabled = adminSettings?.enableHybridSearch ?? false;

    // 1. Full-text search (always enabled) - reduced pool for stricter results
    const textResults = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      api.search.presentations.fullTextSearch,
      {
        query: args.query,
        userId: user._id,
        filter: args.filter,
        limit: hybridSearchEnabled ? 20 : limit, // Reduced from 40
      },
    )) as Doc<"presentations">[];

    // 2. Vector search (only if enabled by admin)
    if (!hybridSearchEnabled) {
      return textResults.slice(0, limit);
    }

    try {
      const { embedding } = await embed({
        model: EMBEDDING_MODEL,
        value: args.query,
      });

      // Vector search on presentations
      const vectorResults = await ctx.vectorSearch(
        "presentations",
        "by_embedding",
        {
          vector: embedding,
          limit: 30, // Reduced from 40
          filter: (q: any) => q.eq("userId", user._id),
        },
      );

      // Filter by similarity threshold and extract docs
      const vectorResultDocs: Doc<"presentations">[] = [];
      for (const r of vectorResults) {
        // Only include results above similarity threshold
        if (r._score >= VECTOR_SIMILARITY_THRESHOLD) {
          const { _score, ...doc } = r;
          vectorResultDocs.push(doc as Doc<"presentations">);
        }
      }

      // Apply filter (starred/pinned) to vector results
      let filteredVectorResults = vectorResultDocs;
      if (args.filter === "starred") {
        filteredVectorResults = filteredVectorResults.filter(
          (p) => p.starred === true,
        );
      } else if (args.filter === "pinned") {
        filteredVectorResults = filteredVectorResults.filter(
          (p) => p.pinned === true,
        );
      }

      // 3. RRF merge with score threshold
      const merged = applyRRF(textResults, filteredVectorResults);

      // Filter by minimum RRF score for stricter relevance
      const relevantResults = merged.filter((r) => r.score >= MIN_RRF_SCORE);

      return relevantResults
        .slice(0, limit)
        .map(({ score, ...item }) => item as Doc<"presentations">);
    } catch (error) {
      logger.error("Vector search failed, falling back to text-only", {
        tag: "PresentationSearch",
        error: String(error),
      });
      return textResults.slice(0, limit);
    }
  },
});

/**
 * Full-text search using Convex search index on title
 */
export const fullTextSearch = query({
  args: {
    query: v.string(),
    userId: v.id("users"),
    filter: v.optional(
      v.union(v.literal("all"), v.literal("starred"), v.literal("pinned")),
    ),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("presentations")
      .withSearchIndex("search_title", (q) => q.search("title", args.query))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .take(args.limit);

    // Apply filter
    if (args.filter === "starred") {
      results = results.filter((p) => p.starred === true);
    } else if (args.filter === "pinned") {
      results = results.filter((p) => p.pinned === true);
    }

    return results;
  },
});

/**
 * Get all presentations with optional filter (for non-search case)
 * Used when search query is empty
 */
export const list = query({
  args: {
    filter: v.optional(
      v.union(v.literal("all"), v.literal("starred"), v.literal("pinned")),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const limit = args.limit || 50;

    let presentations = await ctx.db
      .query("presentations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    // Apply filter
    if (args.filter === "starred") {
      presentations = presentations.filter((p) => p.starred === true);
    } else if (args.filter === "pinned") {
      presentations = presentations.filter((p) => p.pinned === true);
    }

    // Sort: pinned first, then by updatedAt
    return presentations.sort((a, b) => {
      const aPinned = a.pinned === true;
      const bPinned = b.pinned === true;
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  },
});

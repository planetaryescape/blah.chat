import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction, internalQuery } from "../_generated/server";

// Helper: RRF (Reciprocal Rank Fusion) merging
function applyRRF(
  textResults: any[],
  vectorResults: any[],
  k: number = 60,
): any[] {
  const scores = new Map();

  // Score text results
  textResults.forEach((item, idx) => {
    scores.set(item._id, {
      score: 1 / (k + idx + 1),
      item,
    });
  });

  // Add vector results (boost if item appears in both)
  vectorResults.forEach((item, idx) => {
    const score = 1 / (k + idx + 1);
    const existing = scores.get(item._id);
    if (existing) {
      existing.score += score; // Boost overlapping results
    } else {
      scores.set(item._id, { score, item });
    }
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ item, score }) => ({ ...item, score }));
}

// Keyword search using search index
export const keywordSearch = internalQuery({
  args: {
    userId: v.id("users"),
    query: v.string(),
    limit: v.number(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => {
        let query = q.search("content", args.query);
        query = query.eq("userId", args.userId);
        if (args.category) {
          query = query.eq("metadata.category", args.category);
        }
        return query;
      })
      .take(args.limit);

    return results;
  },
});

// Vector search using embeddings
export const vectorSearch = internalAction({
  args: {
    userId: v.id("users"),
    embedding: v.array(v.float64()),
    limit: v.number(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Doc<"memories">[]> => {
    try {
      // Use native Convex vector search
      const results = await ctx.vectorSearch("memories", "by_embedding", {
        vector: args.embedding,
        limit: args.limit,
        filter: (q) => q.eq("userId", args.userId),
      });

      console.log(`[VectorSearch] Found ${results.length} results, top score: ${results[0]?._score}`);

      // Fetch full documents
      const memories: Doc<"memories">[] = await Promise.all(
        results.map(async (result) => {
          const memory = await ctx.runQuery(internal.memories.getMemoryById, {
            id: result._id,
          });
          return memory;
        })
      ).then(mems => mems.filter((m): m is Doc<"memories"> => m !== null));

      // Client-side category filter if needed
      if (args.category) {
        return memories.filter(
          (m: Doc<"memories">) => m.metadata?.category === args.category,
        );
      }

      return memories;
    } catch (error) {
      console.error("[VectorSearch] Failed, falling back to empty:", error);
      // Fallback: return empty (graceful degradation)
      return [];
    }
  },
});

// Hybrid search combining keyword + vector with RRF
export const hybridSearch = internalAction({
  args: {
    userId: v.id("users"),
    query: v.string(),
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const searchLimit = Math.min(limit * 4, 40); // RRF needs more results

    try {
      // 1. Generate embedding for vector search
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: args.query,
      });

      // 2. Run both searches in parallel
      const [textResults, vectorResults] = await Promise.all([
        ctx.runQuery(internal.memories.search.keywordSearch, {
          userId: args.userId,
          query: args.query,
          limit: searchLimit,
          category: args.category,
        }),
        ctx.runAction(internal.memories.search.vectorSearch, {
          userId: args.userId,
          embedding,
          limit: searchLimit,
          category: args.category,
        }),
      ]);

      // 3. Merge with RRF
      const merged = applyRRF(textResults, vectorResults, 60);

      return merged.slice(0, limit);
    } catch (error) {
      console.error("Hybrid search failed:", error);
      // Fallback to empty results on error
      return [];
    }
  },
});

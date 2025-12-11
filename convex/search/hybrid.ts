import { embed } from "ai";
import { v } from "convex/values";
import { EMBEDDING_MODEL } from "../../src/lib/ai/operational-models";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action, query } from "../_generated/server";

/**
 * Hybrid search using RRF (Reciprocal Rank Fusion)
 * Combines full-text + vector search when enabled by admin
 */
export const hybridSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    conversationId: v.optional(v.id("conversations")),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    messageType: v.optional(v.union(v.literal("user"), v.literal("assistant"))),
  },
  handler: async (ctx, args): Promise<Doc<"messages">[]> => {
    const user = (await (ctx.runQuery as any)(
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

    // 1. Full-text search (always enabled)
    const textResults = (await (ctx.runQuery as any)(
      api.search.fullTextSearch,
      {
        query: args.query,
        userId: user._id,
        conversationId: args.conversationId,
        dateFrom: args.dateFrom,
        dateTo: args.dateTo,
        messageType: args.messageType,
        limit: hybridSearchEnabled ? 40 : limit, // Fetch more for RRF merging if hybrid
      },
    )) as Doc<"messages">[];

    // 2. Vector search (only if enabled by admin)
    if (!hybridSearchEnabled) {
      return textResults.slice(0, limit);
    }

    try {
      const { embedding } = await embed({
        model: EMBEDDING_MODEL,
        value: args.query,
      });

      const vectorResults = (await (ctx.runQuery as any)(
        api.search.vectorSearch,
        {
          embedding,
          userId: user._id,
          conversationId: args.conversationId,
          dateFrom: args.dateFrom,
          dateTo: args.dateTo,
          messageType: args.messageType,
          limit: 40,
        },
      )) as Doc<"messages">[];

      // 3. RRF merge
      return mergeWithRRF(textResults, vectorResults, limit);
    } catch (error) {
      console.error("Vector search failed, falling back to text-only:", error);
      return textResults.slice(0, limit);
    }
  },
});

/**
 * Full-text search using Convex search index
 */
export const fullTextSearch = query({
  args: {
    query: v.string(),
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    messageType: v.optional(v.union(v.literal("user"), v.literal("assistant"))),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("messages")
      .withSearchIndex("search_content", (q) => q.search("content", args.query))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .take(args.limit);

    // Apply filters
    if (args.conversationId) {
      results = results.filter((m) => m.conversationId === args.conversationId);
    }

    if (args.dateFrom !== undefined && args.dateTo !== undefined) {
      results = results.filter(
        (m) => m.createdAt >= args.dateFrom! && m.createdAt <= args.dateTo!,
      );
    }

    if (args.messageType) {
      results = results.filter((m) => m.role === args.messageType);
    }

    return results;
  },
});

/**
 * Vector search using Convex vector index
 */
export const vectorSearch = query({
  args: {
    embedding: v.array(v.float64()),
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    messageType: v.optional(v.union(v.literal("user"), v.literal("assistant"))),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get messages with embeddings for this user
    const results = await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.neq(q.field("embedding"), undefined)) // Has embedding
      .collect();

    // Manual vector similarity (Convex will add native support soon)
    const withScores = results.map((msg) => {
      const score = msg.embedding
        ? cosineSimilarity(args.embedding, msg.embedding)
        : 0;
      return { ...msg, score };
    });

    // Sort by score descending
    withScores.sort((a, b) => b.score - a.score);

    // Apply filters
    let filtered = withScores;

    if (args.conversationId) {
      filtered = filtered.filter(
        (m) => m.conversationId === args.conversationId,
      );
    }

    if (args.dateFrom !== undefined && args.dateTo !== undefined) {
      filtered = filtered.filter(
        (m) => m.createdAt >= args.dateFrom! && m.createdAt <= args.dateTo!,
      );
    }

    if (args.messageType) {
      filtered = filtered.filter((m) => m.role === args.messageType);
    }

    // Return top N without score
    return filtered.slice(0, args.limit).map(({ score, ...msg }) => msg);
  },
});

/**
 * RRF (Reciprocal Rank Fusion) merge
 * Combines rankings from multiple sources
 */
function mergeWithRRF<T extends Doc<"messages">>(
  textResults: T[],
  vectorResults: T[],
  limit: number,
  k = 60,
): T[] {
  const scores = new Map<string, { score: number; item: T }>();

  // Add text results with RRF scoring
  textResults.forEach((item, idx) => {
    const id = item._id.toString();
    scores.set(id, { score: 1 / (k + idx + 1), item });
  });

  // Add vector results with RRF scoring
  vectorResults.forEach((item, idx) => {
    const id = item._id.toString();
    const score = 1 / (k + idx + 1);
    const existing = scores.get(id);
    if (existing) {
      existing.score += score; // Boost items in both results
    } else {
      scores.set(id, { score, item });
    }
  });

  // Sort by combined score and return top N
  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalQuery } from "../_generated/server";

/**
 * Hybrid search for conversations
 * Combines title search (keyword) + message content search (semantic)
 */
export const hybridSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    includeArchived: v.optional(v.boolean()),
    projectId: v.optional(v.union(v.id("projects"), v.literal("none"))),
  },
  handler: async (ctx, args): Promise<Doc<"conversations">[]> => {
    // @ts-ignore - Convex query type instantiation depth issue
    const user: any = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) return [];

    const { query, limit = 20, includeArchived = false } = args;

    // 1. Keyword search on conversation titles
    const keywordResults: any = await ctx.runQuery(
      // @ts-ignore - Convex query type instantiation depth issue
      internal.conversations.hybridSearch.keywordSearch,
      { query, userId: user._id, limit: 40, includeArchived },
    );

    // 2. Semantic search on recent messages, group by conversation
    try {
      // Generate embedding in ACTION (not query) since it requires network call
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: query,
      });

      const semanticResults: any = await ctx.runQuery(
        internal.conversations.hybridSearch.semanticSearchWithEmbedding,
        { embedding, userId: user._id, limit: 40, includeArchived },
      );

      // 3. Merge with RRF
      let merged = mergeConversationsRRF(
        keywordResults,
        semanticResults,
        limit * 2,
      );

      // 4. Apply project filter AFTER RRF merge
      if (args.projectId !== undefined) {
        if (args.projectId === "none") {
          merged = merged.filter((c) => c.projectId === undefined);
        } else {
          merged = merged.filter((c) => c.projectId === args.projectId);
        }
      }

      return merged.slice(0, limit);
    } catch (error) {
      // Structured logging with context
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      console.error("Semantic search failed, using keyword fallback", {
        error: errorMessage,
        stack,
        userId: user._id,
        query: args.query.slice(0, 100),
        timestamp: Date.now(),
        projectFilter: args.projectId,
      });

      // Fallback to keyword-only (graceful degradation)
      let results = keywordResults.slice(0, limit * 2);

      // Apply project filter to fallback results
      if (args.projectId !== undefined) {
        if (args.projectId === "none") {
          results = results.filter(
            (c: Doc<"conversations">) => c.projectId === undefined,
          );
        } else {
          results = results.filter(
            (c: Doc<"conversations">) => c.projectId === args.projectId,
          );
        }
      }

      return results.slice(0, limit);
    }
  },
});

/**
 * Keyword search on conversation titles
 */
export const keywordSearch = internalQuery({
  args: {
    query: v.string(),
    userId: v.id("users"),
    limit: v.number(),
    includeArchived: v.boolean(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("conversations")
      .withSearchIndex("search_title", (q) => q.search("title", args.query))
      .filter((q) => {
        let filter = q.eq(q.field("userId"), args.userId);
        if (!args.includeArchived) {
          filter = q.and(filter, q.eq(q.field("archived"), false));
        }
        return filter;
      })
      .take(args.limit);

    return results;
  },
});

/**
 * Semantic search via message content, grouped by conversation
 * Accepts pre-computed embedding (generated in action, since queries can't make network calls)
 */
export const semanticSearchWithEmbedding = internalQuery({
  args: {
    embedding: v.array(v.number()),
    userId: v.id("users"),
    limit: v.number(),
    includeArchived: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Vector search on messages, group by conversationId
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.neq(q.field("embedding"), undefined))
      .collect();

    // Calculate cosine similarity for each message
    const scored = messages
      .map((msg) => ({
        message: msg,
        score: msg.embedding
          ? cosineSimilarity(args.embedding, msg.embedding)
          : 0,
      }))
      .sort((a, b) => b.score - a.score);

    // Group by conversationId, take top conversation per unique ID
    const conversationIds = new Set<Id<"conversations">>();
    const topConversations: Id<"conversations">[] = [];

    for (const item of scored) {
      if (!conversationIds.has(item.message.conversationId)) {
        conversationIds.add(item.message.conversationId);
        topConversations.push(item.message.conversationId);
        if (topConversations.length >= args.limit) break;
      }
    }

    // Fetch full conversation objects
    const conversations = await Promise.all(
      topConversations.map((id) => ctx.db.get(id)),
    );

    // Filter out null conversations and archived if needed
    return conversations.filter(
      (c) => c !== null && (args.includeArchived || !c.archived),
    ) as Doc<"conversations">[];
  },
});

/**
 * RRF (Reciprocal Rank Fusion) merge for conversations
 */
function mergeConversationsRRF<T extends Doc<"conversations">>(
  keywordResults: T[],
  semanticResults: T[],
  limit: number,
  k = 60,
): T[] {
  const scores = new Map<string, { score: number; item: T }>();

  // Add keyword results with RRF scoring
  keywordResults.forEach((item, idx) => {
    const id = item._id.toString();
    scores.set(id, { score: 1 / (k + idx + 1), item });
  });

  // Add semantic results with RRF scoring
  semanticResults.forEach((item, idx) => {
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

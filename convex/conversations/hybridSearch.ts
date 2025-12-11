import { embed } from "ai";
import { v } from "convex/values";
import { EMBEDDING_MODEL } from "../../src/lib/ai/operational-models";
import { internal } from "../_generated/api";
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
    const user = ((await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getCurrentUser,
      {},
    )) as Doc<"users"> | null);
    if (!user) return [];

    const { query, limit = 20, includeArchived = false } = args;

    // 1. Keyword search on conversation titles
    const keywordResults = await ctx.runQuery(
      internal.conversations.hybridSearch.keywordSearch,
      { query, userId: user._id, limit: 40, includeArchived },
    );

    // 2. Semantic search on recent messages, group by conversation
    try {
      // Generate embedding in ACTION (not query) since it requires network call
      const { embedding } = await embed({
        model: EMBEDDING_MODEL,
        value: query,
      });

      // Phase 7: Use native vector index (not manual scoring)
      const messageResults = await ctx.vectorSearch("messages", "by_embedding", {
        vector: embedding,
        limit: 100, // Get more messages to ensure we have enough conversations
        filter: (q) => q.eq("userId", user._id),
      });

      // Group by conversationId - vectorSearch results have all document fields
      const conversationIds = new Set<Id<"conversations">>();
      const topConversations: Id<"conversations">[] = [];

      for (const result of messageResults) {
        // Type assertion: vectorSearch returns document fields + _score
        const convId = (result as any).conversationId as Id<"conversations">;
        if (!conversationIds.has(convId)) {
          conversationIds.add(convId);
          topConversations.push(convId);
          if (topConversations.length >= 40) break;
        }
      }

      // Fetch full conversation objects using helper query (action context)
      const conversations = await ctx.runQuery(
        internal.lib.helpers.getConversationsByIds,
        { ids: topConversations },
      );

      // Filter archived conversations if needed
      const semanticResults = conversations.filter(
        (c: Doc<"conversations">): c is Doc<"conversations"> =>
          includeArchived || !c.archived,
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

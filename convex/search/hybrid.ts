import { embed } from "ai";
import { v } from "convex/values";
import { EMBEDDING_MODEL } from "@/lib/ai/operational-models";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action, query } from "../_generated/server";
import { mergeMessagesWithRRF } from "../lib/utils/search";

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

      // Phase 7: Use native vector index (not manual scoring)
      const vectorResults = await ctx.vectorSearch("messages", "by_embedding", {
        vector: embedding,
        limit: 40,
        // biome-ignore lint/suspicious/noExplicitAny: Convex filter builder type depth
        filter: (q: any) =>
          args.conversationId
            ? q.eq("userId", user._id).eq("conversationId", args.conversationId)
            : q.eq("userId", user._id),
      });

      // Extract Doc<"messages"> format (vectorSearch returns { _score, ...fields })
      const vectorResultMessages = vectorResults.map((r) => {
        // biome-ignore lint/performance/noDelete: Need to remove _score from result
        const { _score, ...messageDoc } = r;
        return messageDoc as Doc<"messages">;
      });

      // Apply additional filters not supported by vector index filterFields
      let filteredVectorResults = vectorResultMessages;

      if (args.dateFrom !== undefined && args.dateTo !== undefined) {
        filteredVectorResults = filteredVectorResults.filter(
          (m) => m.createdAt >= args.dateFrom! && m.createdAt <= args.dateTo!,
        );
      }

      if (args.messageType) {
        filteredVectorResults = filteredVectorResults.filter(
          (m) => m.role === args.messageType,
        );
      }

      // 3. RRF merge
      return mergeMessagesWithRRF(
        textResults,
        filteredVectorResults.slice(0, 40),
        limit,
      );
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

import {
  calculateEmbeddingCost,
  EMBEDDING_MODEL,
  EMBEDDING_PRICING,
} from "@blah-chat/ai/operational-models";
import { embed } from "ai";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action, internalQuery, query } from "../_generated/server";
import { canAccessConversation } from "../conversations/branching";
import { logger } from "../lib/logger";
import { getCurrentUser } from "../lib/userSync";
import { mergeMessagesWithRRF } from "../lib/utils/search";
import { estimateTokens } from "../tokens/counting";

/**
 * Bounds applied by every public search entrypoint before search-result reads
 * or paid embedding work. The REST route enforces the same maxima in Zod;
 * direct Convex callers bypass that route, so the module enforces them again.
 */
const MAX_SEARCH_LIMIT = 100;
const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_QUERY_LENGTH = 500;

/**
 * Trim a search query and fail closed on empty or oversized input.
 * Returns null when the query must not be executed.
 */
function normalizeSearchQuery(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_SEARCH_QUERY_LENGTH) {
    return null;
  }
  return trimmed;
}

/**
 * Coerce a caller limit into a finite integer in [1, MAX_SEARCH_LIMIT].
 * Non-finite input falls back to the default instead of being executed.
 */
function normalizeSearchLimit(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_SEARCH_LIMIT;
  return Math.min(Math.max(Math.trunc(raw), 1), MAX_SEARCH_LIMIT);
}

/**
 * Trusted conversation gate for action callers.
 *
 * Actions cannot read the database directly. `hybridSearch` passes the
 * identity-derived user so this returns false before any embedding spend when
 * the requested conversation filter is not readable by that principal.
 */
export const canSearchConversation = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<boolean> => {
    return await canAccessConversation(ctx, args.conversationId, args.userId);
  },
});

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

    // Bound the query and limit before search-result reads or embedding spend.
    const query = normalizeSearchQuery(args.query);
    if (query === null) return [];
    const limit = normalizeSearchLimit(args.limit ?? DEFAULT_SEARCH_LIMIT);

    // A conversation filter is only honored for a conversation the current
    // principal may read. Check before the vector/embedding path runs.
    if (args.conversationId) {
      // SAFETY: The referenced internal query returns boolean; Convex's
      // recursive API type exceeds compiler depth at this module count.
      const canReadConversation: boolean = await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.search.hybrid.canSearchConversation,
        { conversationId: args.conversationId, userId: user._id },
      );
      if (!canReadConversation) return [];
    }

    // Check admin settings for hybrid search
    const adminSettings = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.adminSettings.getInternal,
      {},
    )) as { enableHybridSearch?: boolean } | null;
    const hybridSearchEnabled = adminSettings?.enableHybridSearch ?? false;

    // 1. Full-text search (always enabled)
    const textResults = (await (ctx.runQuery as any)(
      api.search.fullTextSearch,
      {
        query,
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
      const tokenCount = estimateTokens(query);
      const { embedding } = await embed({
        model: EMBEDDING_MODEL,
        value: query,
      });

      // Track embedding cost
      await ctx.scheduler.runAfter(
        0,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.usage.mutations.recordEmbedding,
        {
          userId: user._id,
          model: EMBEDDING_PRICING.model,
          tokenCount,
          cost: calculateEmbeddingCost(tokenCount),
          feature: "chat",
        },
      );

      // Phase 7: Use native vector index (not manual scoring)
      const vectorResults = await ctx.vectorSearch("messages", "by_embedding", {
        vector: embedding,
        limit: 40,
        filter: (q: any) =>
          args.conversationId
            ? q.eq("userId", user._id).eq("conversationId", args.conversationId)
            : q.eq("userId", user._id),
      });

      // Extract Doc<"messages"> format (vectorSearch returns { _score, ...fields })
      const vectorResultMessages = vectorResults.map((r) => {
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
      logger.error("Vector search failed, falling back to text-only", {
        tag: "HybridSearch",
        error: String(error),
      });
      return textResults.slice(0, limit);
    }
  },
});

/**
 * Full-text search using Convex search index
 *
 * Public alias of a private-message read, so identity is derived from the
 * authenticated principal and the `userId` argument is only a compatibility
 * echo of that principal. A supplied user ID is never authorization: a
 * foreign or anonymous caller receives no rows and causes no message read.
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
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // The argument is kept for existing callers but must match the principal.
    if (args.userId !== user._id) return [];

    const query = normalizeSearchQuery(args.query);
    if (query === null) return [];
    const limit = normalizeSearchLimit(args.limit);

    // A conversation filter may only narrow conversations the caller can read.
    if (
      args.conversationId &&
      !(await canAccessConversation(ctx, args.conversationId, user._id))
    ) {
      return [];
    }

    let results = await ctx.db
      .query("messages")
      .withSearchIndex("search_content", (q) => q.search("content", query))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .take(limit);

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

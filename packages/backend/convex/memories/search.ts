import { embed, generateText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "@/lib/ai/gateway";
import {
  EMBEDDING_MODEL,
  MEMORY_RERANK_MODEL,
} from "@/lib/ai/operational-models";
import { getModel } from "@/lib/ai/registry";
import { calculateCost } from "@/lib/ai/utils";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction, internalQuery } from "../_generated/server";
import { buildMemoryRerankPrompt } from "../lib/prompts/operational/memoryRerank";
import { applyRRF } from "../lib/utils/search";

const MIN_CONFIDENCE = 0.7;

// Helper: Rerank memories with LLM
async function rerankMemories(
  query: string,
  candidates: Doc<"memories">[],
  ctx: ActionCtx,
  userId: Id<"users">,
): Promise<Doc<"memories">[]> {
  if (candidates.length <= 1) return candidates;

  const prompt = buildMemoryRerankPrompt(query, candidates);

  try {
    const result = await generateText({
      model: getModel(MEMORY_RERANK_MODEL.id),
      prompt,
      temperature: 0,
      providerOptions: getGatewayOptions(MEMORY_RERANK_MODEL.id, undefined, [
        "memory-rerank",
      ]),
    });

    // Track usage with feature: "memory"
    if (result.usage) {
      const inputTokens = result.usage.inputTokens ?? 0;
      const outputTokens = result.usage.outputTokens ?? 0;
      const cost = calculateCost(MEMORY_RERANK_MODEL.id, {
        inputTokens,
        outputTokens,
      });

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.usage.mutations.recordTextGeneration,
        {
          userId,
          model: MEMORY_RERANK_MODEL.id,
          inputTokens,
          outputTokens,
          cost,
          feature: "memory",
        },
      );
    }

    const indices = result.text
      .trim()
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((i) => !Number.isNaN(i) && i >= 0 && i < candidates.length);

    // Fallback to original order if parsing fails
    if (indices.length === 0) {
      console.log(
        "[Rerank] Failed to parse LLM response, using original order",
      );
      return candidates;
    }

    const reranked = indices.map((i) => candidates[i]);
    return reranked;
  } catch (error) {
    console.error("[Rerank] Failed, using original order:", error);
    return candidates;
  }
}

// Get identity memories (always injected, no query needed)
export const getIdentityMemories = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const now = Date.now();

    // OPTIMIZATION: Use indexed queries for each identity category (O(1) vs O(n))
    // Parallel fetch from compound index by_user_category
    const [identity, preference, relationship] = await Promise.all([
      ctx.db
        .query("memories")
        .withIndex("by_user_category", (q) =>
          q.eq("userId", args.userId).eq("metadata.category", "identity"),
        )
        .collect(),
      ctx.db
        .query("memories")
        .withIndex("by_user_category", (q) =>
          q.eq("userId", args.userId).eq("metadata.category", "preference"),
        )
        .collect(),
      ctx.db
        .query("memories")
        .withIndex("by_user_category", (q) =>
          q.eq("userId", args.userId).eq("metadata.category", "relationship"),
        )
        .collect(),
    ]);

    const allIdentityMemories = [...identity, ...preference, ...relationship];

    // Filter by quality (confidence, expiration, superseded) - minimal JS filtering
    const filtered = allIdentityMemories.filter((m) => {
      // Skip low confidence
      if (m.metadata?.confidence && m.metadata.confidence < MIN_CONFIDENCE) {
        return false;
      }

      // Skip expired
      if (m.metadata?.expiresAt && m.metadata.expiresAt < now) {
        return false;
      }

      // Skip superseded
      if (m.metadata?.supersededBy) {
        return false;
      }

      return true;
    });

    // Take limit
    const limited = filtered.slice(0, limit);

    return limited;
  },
});

// Keyword search using search index
export const keywordSearch = internalQuery({
  args: {
    userId: v.id("users"),
    query: v.string(),
    limit: v.number(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
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

      // Fetch full documents
      const ids = results.map((result) => result._id);
      const memories: Doc<"memories">[] = await ctx.runQuery(
        internal.lib.helpers.getMemoriesByIds,
        {
          ids,
        },
      );

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

// Hybrid search combining keyword + vector with RRF + reranking
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
        model: EMBEDDING_MODEL,
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
      const merged = applyRRF(
        textResults,
        vectorResults,
        60,
      ) as (Doc<"memories"> & { score: number })[];

      // 4. Filter by quality (confidence, expiration, superseded)
      const now = Date.now();
      const filtered = merged.filter((m) => {
        // Skip low confidence
        if (m.metadata?.confidence && m.metadata.confidence < MIN_CONFIDENCE) {
          return false;
        }

        // Skip expired
        if (m.metadata?.expiresAt && m.metadata.expiresAt < now) {
          return false;
        }

        // Skip superseded
        if (m.metadata?.supersededBy) {
          return false;
        }

        return true;
      });

      console.log(
        `[Memory] Filtered ${merged.length - filtered.length} memories (confidence/expiration/superseded)`,
      );

      // 5. Take top 20 candidates for reranking
      const candidates = filtered.slice(0, 20);

      // 6. Rerank with LLM
      const reranked = await rerankMemories(
        args.query,
        candidates,
        ctx,
        args.userId,
      );

      // 7. Return top N after reranking
      return reranked.slice(0, limit);
    } catch (error) {
      console.error("Hybrid search failed:", error);
      // Fallback to empty results on error
      return [];
    }
  },
});

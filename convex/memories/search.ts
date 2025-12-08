import { openai } from "@ai-sdk/openai";
import { embed, generateText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import { getModel } from "../../src/lib/ai/registry";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction, internalQuery } from "../_generated/server";

// Constants for memory retrieval
const MIN_CONFIDENCE = 0.7; // Filter memories below 70% confidence

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

// Helper: Rerank memories with LLM
async function rerankMemories(
  query: string,
  candidates: Doc<"memories">[],
): Promise<Doc<"memories">[]> {
  if (candidates.length <= 1) return candidates;

  const prompt = `Rerank these memories by relevance to query: "${query}"

Memories:
${candidates.map((m, i) => `${i}. ${m.content}`).join("\n")}

Return ONLY comma-separated indices in relevance order (most relevant first).
Example: 3,0,5,1,2

Response:`;

  try {
    const result = await generateText({
      model: getModel("cerebras:gpt-oss-120b"),
      prompt,
      temperature: 0,
      providerOptions: getGatewayOptions("cerebras:gpt-oss-120b", undefined, ["memory-rerank"]),
    });

    const indices = result.text
      .trim()
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((i) => !isNaN(i) && i >= 0 && i < candidates.length);

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
    const identityCategories = ["identity", "preference", "relationship"];
    const now = Date.now();

    // Fetch all memories for user, then filter in JavaScript
    // (Convex FilterBuilder doesn't support isNull checks)
    const allMemories = await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter by quality and category
    const filtered = allMemories.filter((m) => {
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

      // Only identity categories
      if (
        !m.metadata?.category ||
        !identityCategories.includes(m.metadata.category)
      ) {
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

      // Fetch full documents
      const memories: Doc<"memories">[] = await Promise.all(
        results.map(async (result) => {
          // @ts-ignore - Convex type instantiation depth issue
          const memory = await ctx.runQuery(internal.memories.getMemoryById, {
            id: result._id,
          });
          return memory;
        }),
      ).then((mems) =>
        mems.filter(
          (m: Doc<"memories"> | null): m is Doc<"memories"> => m !== null,
        ),
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

      // 4. Filter by quality (confidence, expiration, superseded)
      const now = Date.now();
      const filtered = merged.filter((m: Doc<"memories">) => {
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
      const reranked = await rerankMemories(args.query, candidates);

      // 7. Return top N after reranking
      return reranked.slice(0, limit);
    } catch (error) {
      console.error("Hybrid search failed:", error);
      // Fallback to empty results on error
      return [];
    }
  },
});

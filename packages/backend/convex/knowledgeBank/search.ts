/**
 * Knowledge Bank Search
 *
 * Vector search across knowledge chunks with optional project scoping.
 * Searches both user-level and project-level knowledge when projectId is provided.
 */

import { v } from "convex/values";
import { EMBEDDING_MODEL } from "@/lib/ai/operational-models";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  action,
  internalAction,
  internalQuery,
  query,
} from "../_generated/server";

// Search result interface
export interface KnowledgeSearchResult {
  chunkId: Id<"knowledgeChunks">;
  sourceId: Id<"knowledgeSources">;
  content: string;
  sourceTitle: string;
  sourceType: "file" | "text" | "web" | "youtube";
  sourceUrl?: string;
  timestamp?: string; // YouTube
  pageNumber?: number; // PDF
  scope: "user" | "project";
  score: number;
}

/**
 * Search knowledge bank (public query wrapper)
 * Note: This is a query that returns cached results. For real-time search, use searchAction.
 */
export const search = query({
  args: {
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    sourceTypes: v.optional(
      v.array(
        v.union(
          v.literal("file"),
          v.literal("text"),
          v.literal("web"),
          v.literal("youtube"),
        ),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // This query version can only do basic filtering, not vector search
    // For vector search, use the action version
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { results: [], totalResults: 0 };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return { results: [], totalResults: 0 };

    // Get sources matching criteria
    const sources = await ctx.db
      .query("knowledgeSources")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Filter by scope
    const filteredSources = sources.filter((s) => {
      // If projectId provided, include both project-specific and user-level
      if (args.projectId) {
        return s.projectId === args.projectId || s.projectId === undefined;
      }
      // Otherwise, only user-level (no projectId)
      return s.projectId === undefined;
    });

    // Filter by type if specified
    const typeFilteredSources = args.sourceTypes
      ? filteredSources.filter((s) => args.sourceTypes!.includes(s.type))
      : filteredSources;

    // Get chunks for matching sources (basic text match, not vector)
    const results: KnowledgeSearchResult[] = [];
    const queryLower = args.query.toLowerCase();

    for (const source of typeFilteredSources) {
      const chunks = await ctx.db
        .query("knowledgeChunks")
        .withIndex("by_source", (q) => q.eq("sourceId", source._id))
        .collect();

      for (const chunk of chunks) {
        // Simple text matching (vector search in action)
        if (chunk.content.toLowerCase().includes(queryLower)) {
          results.push({
            chunkId: chunk._id,
            sourceId: source._id,
            content: chunk.content,
            sourceTitle: source.title,
            sourceType: source.type,
            sourceUrl: source.url,
            timestamp: chunk.startTime,
            pageNumber: chunk.pageNumber,
            scope: source.projectId ? "project" : "user",
            score: 1.0, // Text match score
          });
        }
      }
    }

    // Sort by score and apply limit
    const sorted = results.sort((a, b) => b.score - a.score);
    const limited = sorted.slice(0, args.limit || 10);

    return {
      results: limited,
      totalResults: results.length,
    };
  },
});

/**
 * Vector search action (uses embeddings)
 */
export const searchAction = action({
  args: {
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    sourceTypes: v.optional(
      v.array(
        v.union(
          v.literal("file"),
          v.literal("text"),
          v.literal("web"),
          v.literal("youtube"),
        ),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ results: KnowledgeSearchResult[]; totalResults: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { results: [], totalResults: 0 };

    // Get user
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore
      internal.lib.helpers.getCurrentUser,
      {},
    )) as Doc<"users"> | null;
    if (!user) return { results: [], totalResults: 0 };

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(args.query);

    // Perform vector search
    const limit = args.limit || 10;
    const vectorResults = await ctx.vectorSearch(
      "knowledgeChunks",
      "by_embedding",
      {
        vector: queryEmbedding,
        limit: limit * 2, // Fetch more for filtering
        filter: (q) => q.eq("userId", user._id),
      },
    );

    // Get chunk and source details
    const results: KnowledgeSearchResult[] = [];

    for (const result of vectorResults) {
      const chunk = (await (ctx.runQuery as any)(
        // @ts-ignore
        internal.knowledgeBank.search.getChunk,
        { chunkId: result._id },
      )) as Doc<"knowledgeChunks"> | null;

      if (!chunk) continue;

      const source = (await (ctx.runQuery as any)(
        // @ts-ignore
        internal.knowledgeBank.index.getSource,
        { sourceId: chunk.sourceId },
      )) as Doc<"knowledgeSources"> | null;

      if (!source) continue;

      // Filter by project scope
      if (args.projectId) {
        // Include both project-specific and user-level
        if (
          source.projectId !== args.projectId &&
          source.projectId !== undefined
        ) {
          continue;
        }
      } else {
        // Only user-level
        if (source.projectId !== undefined) {
          continue;
        }
      }

      // Filter by source type
      if (args.sourceTypes && !args.sourceTypes.includes(source.type)) {
        continue;
      }

      results.push({
        chunkId: chunk._id,
        sourceId: source._id,
        content: chunk.content,
        sourceTitle: source.title,
        sourceType: source.type,
        sourceUrl: source.url,
        timestamp: chunk.startTime,
        pageNumber: chunk.pageNumber,
        scope: source.projectId ? "project" : "user",
        score: result._score,
      });

      if (results.length >= limit) break;
    }

    return {
      results,
      totalResults: results.length,
    };
  },
});

/**
 * Internal search for AI tools
 */
export const searchInternal = internalAction({
  args: {
    userId: v.id("users"),
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    sourceTypes: v.optional(
      v.array(
        v.union(
          v.literal("file"),
          v.literal("text"),
          v.literal("web"),
          v.literal("youtube"),
        ),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<KnowledgeSearchResult[]> => {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(args.query);

    const limit = args.limit || 10;

    // Perform vector search
    const vectorResults = await ctx.vectorSearch(
      "knowledgeChunks",
      "by_embedding",
      {
        vector: queryEmbedding,
        limit: limit * 2,
        filter: (q) => q.eq("userId", args.userId),
      },
    );

    // Get chunk and source details
    const results: KnowledgeSearchResult[] = [];

    for (const result of vectorResults) {
      const chunk = (await (ctx.runQuery as any)(
        // @ts-ignore
        internal.knowledgeBank.search.getChunk,
        { chunkId: result._id },
      )) as Doc<"knowledgeChunks"> | null;

      if (!chunk) continue;

      const source = (await (ctx.runQuery as any)(
        // @ts-ignore
        internal.knowledgeBank.index.getSource,
        { sourceId: chunk.sourceId },
      )) as Doc<"knowledgeSources"> | null;

      if (!source) continue;

      // Filter by project scope
      if (args.projectId) {
        if (
          source.projectId !== args.projectId &&
          source.projectId !== undefined
        ) {
          continue;
        }
      } else {
        if (source.projectId !== undefined) {
          continue;
        }
      }

      // Filter by source type
      if (args.sourceTypes && !args.sourceTypes.includes(source.type)) {
        continue;
      }

      results.push({
        chunkId: chunk._id,
        sourceId: source._id,
        content: chunk.content,
        sourceTitle: source.title,
        sourceType: source.type,
        sourceUrl: source.url,
        timestamp: chunk.startTime,
        pageNumber: chunk.pageNumber,
        scope: source.projectId ? "project" : "user",
        score: result._score,
      });

      if (results.length >= limit) break;
    }

    return results;
  },
});

/**
 * Get chunk by ID (internal)
 */
export const getChunk = internalQuery({
  args: {
    chunkId: v.id("knowledgeChunks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chunkId);
  },
});

/**
 * Generate embedding for query using AI Gateway
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const { embed } = await import("ai");
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  });
  return embedding;
}

/**
 * Backend Action: Query History
 *
 * Semantic search across conversation messages with optional projectId filter.
 * Works with or without projectId:
 * - With projectId: Search only that project's conversations
 * - Without projectId: Search ALL user's conversations
 */

import { embed } from "ai";
import { v } from "convex/values";
import {
  calculateEmbeddingCost,
  EMBEDDING_MODEL,
  EMBEDDING_PRICING,
} from "@/lib/ai/operational-models";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalAction, internalQuery } from "../../_generated/server";
import { estimateTokens } from "../../tokens/counting";

/**
 * Get all conversation IDs for a user, optionally filtered by project
 */
export const getConversationIds = internalQuery({
  args: {
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    if (args.projectId) {
      // Get conversations via junction table
      const projectId = args.projectId; // Capture for closure
      const junctions = await ctx.db
        .query("projectConversations")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .collect();
      return junctions.map((j) => j.conversationId);
    }

    // Get all user's conversations
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return conversations.map((c) => c._id);
  },
});

export const queryHistory = internalAction({
  args: {
    userId: v.id("users"),
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    limit: v.number(),
    includeCurrentConversation: v.boolean(),
    currentConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    // Get conversation IDs to search
    let conversationIds = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.tools.search.queryHistory.getConversationIds,
      {
        userId: args.userId,
        projectId: args.projectId,
      },
    )) as Id<"conversations">[];

    // Filter out current conversation if requested
    if (!args.includeCurrentConversation && args.currentConversationId) {
      conversationIds = conversationIds.filter(
        (id) => id !== args.currentConversationId,
      );
    }

    if (conversationIds.length === 0) {
      return {
        success: true,
        results: [],
        message: args.projectId
          ? "No conversation history in project"
          : "No conversation history available",
      };
    }

    // Generate query embedding
    const tokenCount = estimateTokens(args.query);
    const { embedding: queryEmbedding } = await embed({
      model: EMBEDDING_MODEL,
      value: args.query,
    });

    // Track embedding cost
    await ctx.scheduler.runAfter(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.usage.mutations.recordEmbedding,
      {
        userId: args.userId,
        model: EMBEDDING_PRICING.model,
        tokenCount,
        cost: calculateEmbeddingCost(tokenCount),
        feature: "chat",
      },
    );

    // Vector search on message embeddings
    const vectorResults = await ctx.vectorSearch("messages", "by_embedding", {
      vector: queryEmbedding,
      limit: args.limit * 3, // Over-fetch for conversationId filtering
      filter: (q) => q.eq("userId", args.userId),
    });

    // Filter by conversationId and fetch full docs
    const messages: Array<
      Doc<"messages"> & { score: number; conversationTitle: string }
    > = [];

    for (const result of vectorResults) {
      const message = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.lib.helpers.getMessage,
        { id: result._id },
      )) as Doc<"messages"> | null;

      if (
        message?.embedding &&
        conversationIds.includes(message.conversationId)
      ) {
        const score = cosineSimilarity(queryEmbedding, message.embedding);

        // Get conversation title
        const conv = (await (ctx.runQuery as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.lib.helpers.getConversation,
          { id: message.conversationId },
        )) as Doc<"conversations"> | null;

        messages.push({
          ...message,
          score,
          conversationTitle: conv?.title || "Untitled",
        });
      }
    }

    // Sort by score and take top results
    const sortedMessages = messages
      .sort((a, b) => b.score - a.score)
      .slice(0, args.limit);

    if (sortedMessages.length === 0) {
      return {
        success: true,
        results: [],
        message: args.projectId
          ? "No matching messages found in project history"
          : "No matching messages found",
      };
    }

    // Format results with IDs for URL construction
    const results = sortedMessages.map((m) => ({
      id: m._id,
      conversationId: m.conversationId,
      conversationTitle: m.conversationTitle,
      role: m.role,
      content: m.content.slice(0, 500) + (m.content.length > 500 ? "..." : ""),
      timestamp: new Date(m._creationTime).toISOString(),
      score: m.score.toFixed(3),
      url: `/chat/${m.conversationId}?messageId=${m._id}#message-${m._id}`,
    }));

    return {
      success: true,
      results,
      totalResults: sortedMessages.length,
    };
  },
});

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

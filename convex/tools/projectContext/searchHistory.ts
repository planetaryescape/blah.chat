/**
 * Backend Action: Search Project History
 *
 * Semantic search across messages in project conversations.
 * Uses vector search with conversationId filtering.
 */

import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";

export const searchHistory = internalAction({
  args: {
    conversationId: v.id("conversations"),
    query: v.string(),
    limit: v.number(),
    includeCurrentConversation: v.boolean(),
  },
  handler: async (ctx, args) => {
    // 1. Get project via conversation
    const conversation = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getConversation,
      { id: args.conversationId },
    )) as Doc<"conversations"> | null;

    if (!conversation?.projectId) {
      return {
        success: true,
        results: [],
        message: "No project associated with this conversation",
      };
    }

    // 2. Get conversation IDs via junction
    const junctions = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.tools.projectContext.helpers.getConversationIds,
      { projectId: conversation.projectId },
    )) as Array<{ conversationId: any }>;

    let conversationIds = junctions.map((j) => j.conversationId);

    // 3. Filter out current conversation if requested
    if (!args.includeCurrentConversation) {
      conversationIds = conversationIds.filter(
        (id) => id !== args.conversationId,
      );
    }

    if (conversationIds.length === 0) {
      return {
        success: true,
        results: [],
        message: "No conversation history available",
      };
    }

    // 4. Vector search on message embeddings
    const messages = (await (ctx.runAction as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.tools.projectContext.helpers.vectorSearchMessages,
      {
        conversationIds,
        query: args.query,
        limit: args.limit,
        userId: conversation.userId,
      },
    )) as Array<
      Doc<"messages"> & { score: number; conversationTitle: string }
    >;

    if (messages.length === 0) {
      return {
        success: true,
        results: [],
        message: "No matching messages found in conversation history",
      };
    }

    // 5. Format results (truncate to 500 chars)
    const results = messages.map((m) => ({
      conversationTitle: m.conversationTitle,
      role: m.role,
      content:
        m.content.slice(0, 500) + (m.content.length > 500 ? "..." : ""),
      timestamp: new Date(m._creationTime).toISOString(),
      score: m.score.toFixed(3),
    }));

    return {
      success: true,
      results,
      totalResults: messages.length,
    };
  },
});

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get batch of conversations for processing
 */
export const getConversationBatch = internalQuery({
  args: { cursor: v.union(v.string(), v.null()), batchSize: v.number() },
  handler: async (ctx, { cursor, batchSize }) => {
    const result = await ctx.db
      .query("conversations")
      .order("asc")
      .paginate({ cursor, numItems: batchSize });

    return {
      conversations: result.page.map((c) => ({ _id: c._id })),
      nextCursor: result.continueCursor,
    };
  },
});

/**
 * Get messages grouped by model for a conversation
 * Source of truth for token counts
 */
export const getMessageTokensByModel = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .filter((q) => q.neq(q.field("role"), "system")) // Skip system prompts
      .collect();

    // Group by model (source of truth)
    const byModel = new Map<
      string,
      {
        totalTokens: number;
        inputTokens: number;
        outputTokens: number;
        reasoningTokens: number;
        messageCount: number;
      }
    >();

    for (const msg of messages) {
      // Only count assistant messages with model info
      if (!msg.model || msg.role !== "assistant") continue;

      const existing = byModel.get(msg.model) || {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        messageCount: 0,
      };

      existing.inputTokens += msg.inputTokens || 0;
      existing.outputTokens += msg.outputTokens || 0;
      existing.reasoningTokens += msg.reasoningTokens || 0;
      existing.totalTokens =
        existing.inputTokens + existing.outputTokens + existing.reasoningTokens;
      existing.messageCount += 1;

      byModel.set(msg.model, existing);
    }

    return Array.from(byModel.entries()).map(([model, data]) => ({
      model,
      ...data,
    }));
  },
});

/**
 * Insert token usage record (idempotent)
 */
export const insertTokenUsageRecord = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    model: v.string(),
    totalTokens: v.number(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    reasoningTokens: v.number(),
    messageCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Idempotency check - skip if already migrated
    const existing = await ctx.db
      .query("conversationTokenUsage")
      .withIndex("by_conversation_model", (q) =>
        q.eq("conversationId", args.conversationId).eq("model", args.model),
      )
      .first();

    if (existing) return; // Already migrated, skip

    const now = Date.now();
    await ctx.db.insert("conversationTokenUsage", {
      conversationId: args.conversationId,
      model: args.model,
      totalTokens: args.totalTokens,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      reasoningTokens: args.reasoningTokens > 0 ? args.reasoningTokens : undefined,
      messageCount: args.messageCount,
      lastUpdatedAt: now,
      createdAt: now,
    });
  },
});

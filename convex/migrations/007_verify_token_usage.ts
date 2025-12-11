import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Verify token usage migration for a conversation
 *
 * Run from Convex Dashboard:
 * internal.migrations.007_verify_token_usage.verifyTokenUsageMigration
 * Args: { conversationId: "..." }
 *
 * Check that new table matches messages (source of truth)
 */
export const verifyTokenUsageMigration = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    // NEW TABLE: conversationTokenUsage
    const newRecords = await ctx.db
      .query("conversationTokenUsage")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const newTotal = newRecords.reduce((sum, r) => sum + r.totalTokens, 0);
    const newMessageCount = newRecords.reduce((sum, r) => sum + r.messageCount, 0);

    // SOURCE OF TRUTH: messages table
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("role"), "assistant"))
      .collect();

    const messageTotal = messages.reduce(
      (sum, m) =>
        sum + (m.inputTokens || 0) + (m.outputTokens || 0) + (m.reasoningTokens || 0),
      0,
    );
    const messagesWithModel = messages.filter((m) => m.model).length;

    return {
      conversationId: args.conversationId,
      new: {
        totalTokens: newTotal,
        messageCount: newMessageCount,
        breakdown: newRecords.map((r) => ({
          model: r.model,
          tokens: r.totalTokens,
          messages: r.messageCount,
        })),
      },
      messages: {
        totalTokens: messageTotal,
        messageCount: messagesWithModel,
      },
      match: newTotal === messageTotal && newMessageCount === messagesWithModel,
    };
  },
});

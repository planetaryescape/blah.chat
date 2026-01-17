import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

const TERMINAL_STATUSES = new Set(["complete", "stopped", "error"]);

export const markThinkingStarted = internalMutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      thinkingStartedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updatePartialReasoning = internalMutation({
  args: {
    messageId: v.id("messages"),
    partialReasoning: v.string(),
  },
  returns: v.object({ updated: v.boolean(), reason: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return { updated: false, reason: "not_found" };

    if (TERMINAL_STATUSES.has(message.status)) {
      return { updated: false, reason: `terminal:${message.status}` };
    }

    await ctx.db.patch(args.messageId, {
      partialReasoning: args.partialReasoning,
      updatedAt: Date.now(),
    });
    return { updated: true };
  },
});

export const completeThinking = internalMutation({
  args: {
    messageId: v.id("messages"),
    reasoning: v.string(),
    reasoningTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      reasoning: args.reasoning,
      partialReasoning: undefined,
      thinkingCompletedAt: Date.now(),
      reasoningTokens: args.reasoningTokens,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Routing Feedback
 *
 * Captures signals for improving routing: thumbs up/down, regeneration,
 * model switching, and completion.
 */

import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";

/**
 * Record routing feedback (internal) - called from generation pipeline.
 */
export const recordRoutingFeedback = internalMutation({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    routeLabel: v.string(),
    selectedModelId: v.string(),
    signal: v.union(
      v.literal("thumbs_up"),
      v.literal("thumbs_down"),
      v.literal("regenerated"),
      v.literal("model_switched"),
      v.literal("completed"),
    ),
    decisionTrace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("routingFeedback", {
      messageId: args.messageId,
      conversationId: args.conversationId,
      userId: args.userId,
      routeLabel: args.routeLabel,
      selectedModelId: args.selectedModelId,
      signal: args.signal,
      decisionTrace: args.decisionTrace,
      createdAt: Date.now(),
    });
  },
});

/**
 * Submit routing feedback (public) - user thumbs up/down from UI.
 */
export const submitRoutingFeedback = mutation({
  args: {
    messageId: v.id("messages"),
    signal: v.union(v.literal("thumbs_up"), v.literal("thumbs_down")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (!message.routingDecision) return; // Not an auto-routed message

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const routingDecision = message.routingDecision as {
      selectedModelId: string;
      routeLabel?: string;
      trace?: unknown;
    };

    await ctx.db.insert("routingFeedback", {
      messageId: args.messageId,
      conversationId: message.conversationId,
      userId: user._id,
      routeLabel: routingDecision.routeLabel ?? "unknown",
      selectedModelId: routingDecision.selectedModelId,
      signal: args.signal,
      decisionTrace: routingDecision.trace
        ? JSON.stringify(routingDecision.trace)
        : undefined,
      createdAt: Date.now(),
    });
  },
});

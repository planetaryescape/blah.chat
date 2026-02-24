/**
 * Routing Mutations
 *
 * Internal mutations for managing routing examples.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const insertRoutingExample = internalMutation({
  args: {
    text: v.string(),
    embedding: v.array(v.float64()),
    routeLabel: v.string(),
    complexity: v.optional(v.string()),
    source: v.union(
      v.literal("seed"),
      v.literal("admin"),
      v.literal("promoted"),
    ),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("routingExamples", {
      text: args.text,
      embedding: args.embedding,
      routeLabel: args.routeLabel,
      complexity: args.complexity,
      source: args.source,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

export const deleteRoutingExample = internalMutation({
  args: { id: v.id("routingExamples") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

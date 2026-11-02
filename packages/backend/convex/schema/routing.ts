/**
 * Routing Schema
 *
 * Tables for the classifier-based router: examples and feedback.
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Routing Examples table - labeled examples for embedding similarity routing.
 *
 * Seeded from static JSON, extended by admin-curated additions.
 */
export const routingExamplesTable = defineTable({
  text: v.string(),
  embedding: v.array(v.float64()),
  routeLabel: v.string(),
  complexity: v.optional(v.string()),
  source: v.union(v.literal("seed"), v.literal("admin"), v.literal("promoted")),
  metadata: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_routeLabel", ["routeLabel"])
  .index("by_source", ["source"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["routeLabel"],
  });

/**
 * Routing Feedback table - signals for improving routing over time.
 *
 * Captures thumbs up/down, regeneration, model switching, and completion signals.
 */
export const routingFeedbackTable = defineTable({
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
  createdAt: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_user", ["userId"])
  .index("by_routeLabel", ["routeLabel"])
  .index("by_signal", ["signal"]);

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const presentationsTable = {
  presentations: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    theme: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("ready"),
      v.literal("presenting"),
    ),
    sourceConversationId: v.optional(v.id("conversations")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  slides: defineTable({
    presentationId: v.id("presentations"),
    userId: v.string(),
    order: v.number(),
    type: v.union(
      v.literal("title"),
      v.literal("content"),
      v.literal("image"),
      v.literal("code"),
      v.literal("split"),
    ),
    content: v.any(), // Slide-type specific content
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_presentation", ["presentationId"])
    .index("by_presentation_order", ["presentationId", "order"]),

  outlineItems: defineTable({
    presentationId: v.id("presentations"),
    userId: v.string(),
    order: v.number(),
    title: v.string(),
    content: v.optional(v.string()),
    isCompleted: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_presentation", ["presentationId"]),

  designTemplates: defineTable({
    userId: v.string(),
    name: v.string(),
    config: v.any(), // Theme configuration
    isDefault: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  presentationSessions: defineTable({
    presentationId: v.id("presentations"),
    userId: v.string(),
    currentSlide: v.number(),
    isActive: v.boolean(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_presentation", ["presentationId"])
    .index("by_user_active", ["userId", "isActive"]),
};

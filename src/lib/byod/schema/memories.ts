import { defineTable } from "convex/server";
import { v } from "convex/values";

export const memoriesTable = {
  memories: defineTable({
    userId: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    source: v.optional(
      v.union(
        v.literal("extracted"),
        v.literal("manual"),
        v.literal("imported"),
      ),
    ),
    sourceConversationId: v.optional(v.id("conversations")),
    sourceMessageId: v.optional(v.id("messages")),
    importance: v.optional(v.number()), // 0-1 score
    embedding: v.optional(v.array(v.float64())),
    isActive: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_user_category", ["userId", "category"])
    .index("by_source_conversation", ["sourceConversationId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId", "category"],
    })
    .vectorIndex("embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "category", "isActive"],
    }),
};

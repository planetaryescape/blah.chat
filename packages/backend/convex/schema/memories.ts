/**
 * Memories table module
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const memoriesTable = defineTable({
  userId: v.id("users"),
  content: v.string(),
  embedding: v.array(v.number()),
  conversationId: v.optional(v.id("conversations")),
  sourceMessageId: v.optional(v.id("messages")),
  sourceMessageIds: v.optional(v.array(v.id("messages"))),
  metadata: v.object({
    category: v.string(),
    importance: v.optional(v.number()),
    reasoning: v.optional(v.string()),
    extractedAt: v.optional(v.number()),
    sourceConversationId: v.optional(v.id("conversations")),
    confidence: v.optional(v.number()),
    verifiedBy: v.optional(
      v.union(
        v.literal("auto"),
        v.literal("manual"),
        v.literal("consolidated"),
      ),
    ),
    expiresAt: v.optional(v.number()),
    version: v.optional(v.number()),
    supersededBy: v.optional(v.id("memories")),
    expirationHint: v.optional(
      v.union(
        v.literal("contextual"),
        v.literal("preference"),
        v.literal("deadline"),
        v.literal("temporary"),
      ),
    ),
  }),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_importance", ["userId", "metadata.importance"])
  .index("by_conversation", ["conversationId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["userId"],
  })
  .searchIndex("search_content", {
    searchField: "content",
    filterFields: ["userId", "metadata.category"],
  });

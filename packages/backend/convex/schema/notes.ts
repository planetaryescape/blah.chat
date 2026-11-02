/**
 * Notes table module
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const notesTable = defineTable({
  userId: v.id("users"),
  title: v.string(),
  content: v.string(),
  htmlContent: v.optional(v.string()),
  sourceMessageId: v.optional(v.id("messages")),
  sourceConversationId: v.optional(v.id("conversations")),
  sourceSelectionText: v.optional(v.string()),
  projectId: v.optional(v.id("projects")),
  tags: v.optional(v.array(v.string())),
  suggestedTags: v.optional(v.array(v.string())),
  isPinned: v.boolean(),
  shareId: v.optional(v.string()),
  isPublic: v.optional(v.boolean()),
  sharePassword: v.optional(v.string()),
  shareExpiresAt: v.optional(v.number()),
  shareCreatedAt: v.optional(v.number()),
  shareViewCount: v.optional(v.number()),
  embedding: v.optional(v.array(v.float64())),
  embeddingStatus: v.optional(
    v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_updated", ["userId", "updatedAt"])
  .index("by_source_message", ["sourceMessageId"])
  .index("by_share_id", ["shareId"])
  .index("by_projectId", ["projectId"])
  .searchIndex("search_notes", {
    searchField: "content",
    filterFields: ["userId"],
  })
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["userId", "projectId"],
  });

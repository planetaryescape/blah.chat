import { defineTable } from "convex/server";
import { v } from "convex/values";

export const bookmarksTable = {
  bookmarks: defineTable({
    userId: v.string(),
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_message", ["messageId"])
    .index("by_conversation", ["conversationId"]),

  snippets: defineTable({
    userId: v.string(),
    title: v.string(),
    content: v.string(),
    language: v.optional(v.string()),
    sourceMessageId: v.optional(v.id("messages")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_source", ["sourceMessageId"]),
};

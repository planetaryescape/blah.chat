/**
 * Bookmarks and Snippets table module
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const bookmarksTable = defineTable({
  userId: v.id("users"),
  messageId: v.id("messages"),
  conversationId: v.id("conversations"),
  note: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_message", ["messageId"])
  .index("by_conversation", ["conversationId"])
  .index("by_user_created", ["userId", "createdAt"]);

export const snippetsTable = defineTable({
  userId: v.id("users"),
  text: v.string(),
  sourceMessageId: v.id("messages"),
  sourceConversationId: v.id("conversations"),
  note: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_message", ["sourceMessageId"])
  .index("by_conversation", ["sourceConversationId"])
  .searchIndex("search_text", {
    searchField: "text",
    filterFields: ["userId"],
  });

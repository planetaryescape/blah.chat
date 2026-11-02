/**
 * Notifications table module
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const notificationsTable = defineTable({
  userId: v.id("users"),
  type: v.string(),
  title: v.string(),
  message: v.string(),
  data: v.optional(
    v.object({
      conversationId: v.optional(v.id("conversations")),
      joinedUserId: v.optional(v.id("users")),
      joinedUserName: v.optional(v.string()),
    }),
  ),
  read: v.boolean(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_unread", ["userId", "read"])
  .index("by_created", ["createdAt"]);

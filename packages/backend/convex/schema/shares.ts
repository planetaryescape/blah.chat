/**
 * Shares and Scheduled Prompts table module
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sharesTable = defineTable({
  userId: v.id("users"),
  conversationId: v.id("conversations"),
  shareId: v.string(),
  title: v.string(),
  expiresAt: v.optional(v.number()),
  isPublic: v.boolean(),
  isActive: v.boolean(),
  password: v.optional(v.string()),
  anonymizeUsernames: v.optional(v.boolean()),
  viewCount: v.number(),
  createdAt: v.number(),
})
  .index("by_share_id", ["shareId"])
  .index("by_user", ["userId"])
  .index("by_conversation", ["conversationId"]);

export const scheduledPromptsTable = defineTable({
  userId: v.id("users"),
  prompt: v.string(),
  schedule: v.object({
    type: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
    ),
    time: v.string(),
    dayOfWeek: v.optional(v.number()),
    dayOfMonth: v.optional(v.number()),
    timezone: v.string(),
  }),
  model: v.string(),
  projectId: v.optional(v.id("projects")),
  isActive: v.boolean(),
  lastRunAt: v.optional(v.number()),
  nextRunAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_next_run", ["nextRunAt", "isActive"]);

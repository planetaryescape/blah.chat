/**
 * Activity Events table module
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const activityEventsTable = defineTable({
  userId: v.id("users"),
  projectId: v.optional(v.id("projects")),
  eventType: v.string(),
  resourceType: v.optional(
    v.union(
      v.literal("task"),
      v.literal("note"),
      v.literal("file"),
      v.literal("conversation"),
    ),
  ),
  resourceId: v.optional(v.string()),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_project", ["projectId"])
  .index("by_user_created", ["userId", "createdAt"])
  .index("by_project_created", ["projectId", "createdAt"]);

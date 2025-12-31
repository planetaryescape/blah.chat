/**
 * Tasks table module
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tasksTable = defineTable({
  userId: v.id("users"),
  title: v.string(),
  description: v.optional(v.string()),
  status: v.union(
    v.literal("suggested"),
    v.literal("confirmed"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("cancelled"),
  ),
  deadline: v.optional(v.number()),
  deadlineSource: v.optional(v.string()),
  urgency: v.optional(
    v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent"),
    ),
  ),
  tags: v.optional(v.array(v.string())),
  sourceType: v.optional(
    v.union(
      v.literal("transcript"),
      v.literal("conversation"),
      v.literal("manual"),
      v.literal("file"),
    ),
  ),
  sourceId: v.optional(v.string()),
  sourceContext: v.optional(
    v.object({
      snippet: v.optional(v.string()),
      timestampSeconds: v.optional(v.number()),
      confidence: v.optional(v.number()),
    }),
  ),
  projectId: v.optional(v.id("projects")),
  priority: v.optional(v.number()),
  position: v.optional(v.number()),
  completedAt: v.optional(v.number()),
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
  .index("by_user_status", ["userId", "status"])
  .index("by_user_deadline", ["userId", "deadline"])
  .index("by_project", ["projectId"])
  .index("by_user_project", ["userId", "projectId"])
  .searchIndex("search_title", {
    searchField: "title",
    filterFields: ["userId", "status", "projectId"],
  })
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["userId", "projectId"],
  });

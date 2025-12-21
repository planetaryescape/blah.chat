import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tagsTable = {
  tags: defineTable({
    userId: v.string(),
    name: v.string(),
    color: v.optional(v.string()),
    scope: v.union(v.literal("user"), v.literal("global")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_name", ["name"]),

  // Tag junctions
  conversationTags: defineTable({
    conversationId: v.id("conversations"),
    tagId: v.id("tags"),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_tag", ["tagId"]),

  noteTags: defineTable({
    noteId: v.id("notes"),
    tagId: v.id("tags"),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_note", ["noteId"])
    .index("by_tag", ["tagId"]),

  taskTags: defineTable({
    taskId: v.id("tasks"),
    tagId: v.id("tags"),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_tag", ["tagId"]),
};

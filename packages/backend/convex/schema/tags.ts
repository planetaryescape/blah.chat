/**
 * Tags table module (centralized tag system)
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tagsTable = defineTable({
  slug: v.string(),
  displayName: v.string(),
  userId: v.optional(v.id("users")),
  scope: v.union(v.literal("user"), v.literal("global")),
  parentId: v.optional(v.id("tags")),
  path: v.string(),
  depth: v.number(),
  usageCount: v.number(),
  color: v.optional(v.string()),
  description: v.optional(v.string()),
  embedding: v.optional(v.array(v.float64())),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user_slug", ["userId", "slug"])
  .index("by_user_usage", ["userId", "usageCount"])
  .index("by_scope", ["scope"])
  .index("by_parent", ["parentId"])
  .index("by_user_path", ["userId", "path"]);

export const bookmarkTagsTable = defineTable({
  bookmarkId: v.id("bookmarks"),
  tagId: v.id("tags"),
  userId: v.id("users"),
  createdAt: v.number(),
})
  .index("by_bookmark", ["bookmarkId"])
  .index("by_tag", ["tagId"])
  .index("by_user", ["userId"])
  .index("by_bookmark_tag", ["bookmarkId", "tagId"]);

export const snippetTagsTable = defineTable({
  snippetId: v.id("snippets"),
  tagId: v.id("tags"),
  userId: v.id("users"),
  createdAt: v.number(),
})
  .index("by_snippet", ["snippetId"])
  .index("by_tag", ["tagId"])
  .index("by_user", ["userId"])
  .index("by_snippet_tag", ["snippetId", "tagId"]);

export const noteTagsTable = defineTable({
  noteId: v.id("notes"),
  tagId: v.id("tags"),
  userId: v.id("users"),
  createdAt: v.number(),
})
  .index("by_note", ["noteId"])
  .index("by_tag", ["tagId"])
  .index("by_user", ["userId"])
  .index("by_note_tag", ["noteId", "tagId"]);

export const taskTagsTable = defineTable({
  taskId: v.id("tasks"),
  tagId: v.id("tags"),
  userId: v.id("users"),
  addedAt: v.number(),
})
  .index("by_task", ["taskId"])
  .index("by_tag", ["tagId"])
  .index("by_user", ["userId"])
  .index("by_task_tag", ["taskId", "tagId"]);

/**
 * Projects table module
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const projectsTable = defineTable({
  userId: v.id("users"),
  name: v.string(),
  description: v.optional(v.string()),
  systemPrompt: v.optional(v.string()),
  isTemplate: v.optional(v.boolean()),
  createdFrom: v.optional(v.id("projects")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_userId_isTemplate", ["userId", "isTemplate"]);

export const projectConversationsTable = defineTable({
  projectId: v.id("projects"),
  conversationId: v.id("conversations"),
  addedAt: v.number(),
  addedBy: v.id("users"),
})
  .index("by_project", ["projectId"])
  .index("by_conversation", ["conversationId"])
  .index("by_project_conversation", ["projectId", "conversationId"]);

export const projectNotesTable = defineTable({
  projectId: v.id("projects"),
  noteId: v.id("notes"),
  userId: v.id("users"),
  addedAt: v.number(),
})
  .index("by_project", ["projectId"])
  .index("by_note", ["noteId"])
  .index("by_user_project", ["userId", "projectId"])
  .index("by_project_note", ["projectId", "noteId"]);

export const projectFilesTable = defineTable({
  projectId: v.id("projects"),
  fileId: v.id("files"),
  userId: v.id("users"),
  addedAt: v.number(),
})
  .index("by_project", ["projectId"])
  .index("by_file", ["fileId"])
  .index("by_user_project", ["userId", "projectId"])
  .index("by_project_file", ["projectId", "fileId"]);

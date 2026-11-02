/**
 * Canvas Documents table module
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const canvasDocumentsTable = defineTable({
  userId: v.id("users"),
  conversationId: v.id("conversations"),
  title: v.string(),
  content: v.string(),
  language: v.optional(v.string()),
  documentType: v.union(v.literal("code"), v.literal("prose")),
  version: v.number(),
  status: v.union(v.literal("active"), v.literal("archived")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_conversation", ["conversationId"])
  .index("by_user_conversation", ["userId", "conversationId"]);

export const canvasHistoryTable = defineTable({
  documentId: v.id("canvasDocuments"),
  userId: v.id("users"),
  content: v.string(),
  version: v.number(),
  source: v.union(
    v.literal("user_edit"),
    v.literal("llm_diff"),
    v.literal("created"),
  ),
  diff: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_document", ["documentId"])
  .index("by_document_version", ["documentId", "version"]);

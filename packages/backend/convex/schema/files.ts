/**
 * Files table module
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const filesTable = defineTable({
  userId: v.id("users"),
  conversationId: v.optional(v.id("conversations")),
  storageId: v.id("_storage"),
  name: v.string(),
  mimeType: v.string(),
  size: v.number(),
  chunkCount: v.optional(v.number()),
  embeddingStatus: v.optional(
    v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
  ),
  embeddingError: v.optional(v.string()),
  processedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_conversation", ["conversationId"]);

export const fileChunksTable = defineTable({
  fileId: v.id("files"),
  userId: v.id("users"),
  projectId: v.optional(v.id("projects")),
  chunkIndex: v.number(),
  content: v.string(),
  startPage: v.optional(v.number()),
  endPage: v.optional(v.number()),
  section: v.optional(v.string()),
  charOffset: v.number(),
  tokenCount: v.number(),
  embedding: v.array(v.float64()),
  createdAt: v.number(),
})
  .index("by_file", ["fileId"])
  .index("by_user", ["userId"])
  .index("by_project", ["projectId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["userId", "projectId"],
  });

export const knowledgeSourcesTable = defineTable({
  userId: v.id("users"),
  projectId: v.optional(v.id("projects")),
  type: v.union(
    v.literal("file"),
    v.literal("text"),
    v.literal("web"),
    v.literal("youtube"),
  ),
  title: v.string(),
  description: v.optional(v.string()),
  storageId: v.optional(v.id("_storage")),
  url: v.optional(v.string()),
  rawContent: v.optional(v.string()),
  videoMetadata: v.optional(
    v.object({
      videoId: v.string(),
      duration: v.optional(v.number()),
      channel: v.optional(v.string()),
      thumbnailUrl: v.optional(v.string()),
    }),
  ),
  mimeType: v.optional(v.string()),
  size: v.optional(v.number()),
  status: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  error: v.optional(v.string()),
  chunkCount: v.optional(v.number()),
  processedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_project", ["projectId"])
  .index("by_user_type", ["userId", "type"])
  .index("by_user_project", ["userId", "projectId"])
  .index("by_status", ["status"]);

export const knowledgeChunksTable = defineTable({
  sourceId: v.id("knowledgeSources"),
  userId: v.id("users"),
  projectId: v.optional(v.id("projects")),
  content: v.string(),
  chunkIndex: v.number(),
  charOffset: v.number(),
  tokenCount: v.number(),
  startTime: v.optional(v.string()),
  endTime: v.optional(v.string()),
  pageNumber: v.optional(v.number()),
  embedding: v.array(v.float64()),
  createdAt: v.number(),
})
  .index("by_source", ["sourceId"])
  .index("by_user", ["userId"])
  .index("by_project", ["projectId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["userId", "projectId"],
  });

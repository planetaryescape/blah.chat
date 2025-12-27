import { defineTable } from "convex/server";
import { v } from "convex/values";

export const messagesTable = {
  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(), // Clerk user ID
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
    ),
    content: v.string(),
    model: v.optional(v.string()),

    // Generation state
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("generating"),
        v.literal("complete"),
        v.literal("error"),
        v.literal("stopped"),
      ),
    ),
    partialContent: v.optional(v.string()),
    error: v.optional(v.string()),
    generationStartedAt: v.optional(v.number()),
    generationCompletedAt: v.optional(v.number()),

    // Token tracking
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    cost: v.optional(v.number()),

    // Branching
    parentMessageId: v.optional(v.id("messages")),
    branchIndex: v.optional(v.number()),

    // Embeddings for vector search
    embedding: v.optional(v.array(v.float64())),

    // Metadata
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_created", ["conversationId", "createdAt"])
    .index("by_user", ["userId"])
    .index("by_parent", ["parentMessageId"])
    .index("by_status", ["status"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId", "conversationId"],
    })
    .vectorIndex("embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "conversationId"],
    }),

  // Tool calls made during generation
  toolCalls: defineTable({
    messageId: v.id("messages"),
    toolName: v.string(),
    toolArgs: v.any(),
    result: v.optional(v.any()),
    status: v.union(
      v.literal("pending"),
      v.literal("complete"),
      v.literal("error"),
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_message", ["messageId"]),

  // Sources cited in responses
  sources: defineTable({
    messageId: v.id("messages"),
    url: v.string(),
    title: v.optional(v.string()),
    snippet: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_message", ["messageId"]),

  // Attachments on messages
  attachments: defineTable({
    messageId: v.id("messages"),
    userId: v.string(),
    storageId: v.optional(v.id("_storage")),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    url: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_user", ["userId"]),
};

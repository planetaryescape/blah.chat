/**
 * Messages table module
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const messagesTable = defineTable({
  conversationId: v.id("conversations"),
  userId: v.optional(v.id("users")),
  role: v.union(
    v.literal("user"),
    v.literal("assistant"),
    v.literal("system"),
  ),
  content: v.string(),
  partialContent: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("complete"),
    v.literal("stopped"),
    v.literal("error"),
  ),
  model: v.optional(v.string()),
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  cost: v.optional(v.number()),
  // Reasoning/thinking support
  reasoning: v.optional(v.string()),
  partialReasoning: v.optional(v.string()),
  reasoningTokens: v.optional(v.number()),
  thinkingStartedAt: v.optional(v.number()),
  thinkingCompletedAt: v.optional(v.number()),
  error: v.optional(v.string()),
  embedding: v.optional(v.array(v.float64())),
  // Provider specific metadata
  providerMetadata: v.optional(v.any()),
  // Branching support
  parentMessageId: v.optional(v.id("messages")),
  branchLabel: v.optional(v.string()),
  branchIndex: v.optional(v.number()),
  // Comparison support
  comparisonGroupId: v.optional(v.string()),
  consolidatedMessageId: v.optional(v.id("messages")),
  isConsolidation: v.optional(v.boolean()),
  votes: v.optional(
    v.object({
      rating: v.union(
        v.literal("left_better"),
        v.literal("right_better"),
        v.literal("tie"),
        v.literal("both_bad"),
      ),
      isWinner: v.boolean(),
      votedAt: v.number(),
    }),
  ),
  generationStartedAt: v.optional(v.number()),
  generationCompletedAt: v.optional(v.number()),
  // Performance metrics
  firstTokenAt: v.optional(v.number()),
  tokensPerSecond: v.optional(v.number()),
  // Memory extraction tracking
  memoryExtracted: v.optional(v.boolean()),
  memoryExtractedAt: v.optional(v.number()),
  // DEPRECATED: Source citations migrated to normalized tables
  sources: v.optional(
    v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        url: v.string(),
        publishedDate: v.optional(v.string()),
        snippet: v.optional(v.string()),
      }),
    ),
  ),
  partialSources: v.optional(
    v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        url: v.string(),
        publishedDate: v.optional(v.string()),
        snippet: v.optional(v.string()),
      }),
    ),
  ),
  sourceMetadata: v.optional(
    v.array(
      v.object({
        sourceId: v.string(),
        ogTitle: v.optional(v.string()),
        ogDescription: v.optional(v.string()),
        ogImage: v.optional(v.string()),
        favicon: v.optional(v.string()),
        domain: v.string(),
        fetchedAt: v.optional(v.number()),
        error: v.optional(v.string()),
      }),
    ),
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_conversation", ["conversationId"])
  .index("by_user", ["userId"])
  .index("by_status", ["status"])
  .index("by_parent", ["parentMessageId"])
  .index("by_comparison_group", ["comparisonGroupId"])
  .index("by_consolidated_message", ["consolidatedMessageId"])
  .index("by_conversation_created", ["conversationId", "createdAt"])
  .index("by_conversation_role", ["conversationId", "role"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["conversationId", "userId"],
  })
  .searchIndex("search_content", {
    searchField: "content",
    filterFields: ["conversationId", "userId", "role"],
  });

export const attachmentsTable = defineTable({
  messageId: v.id("messages"),
  conversationId: v.id("conversations"),
  userId: v.id("users"),
  type: v.union(v.literal("image"), v.literal("file"), v.literal("audio")),
  name: v.string(),
  storageId: v.id("_storage"),
  mimeType: v.string(),
  size: v.number(),
  metadata: v.optional(
    v.object({
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      duration: v.optional(v.number()),
      prompt: v.optional(v.string()),
      model: v.optional(v.string()),
      generationTime: v.optional(v.number()),
    }),
  ),
  createdAt: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_conversation", ["conversationId"])
  .index("by_user", ["userId"])
  .index("by_storage", ["storageId"]);

export const toolCallsTable = defineTable({
  messageId: v.id("messages"),
  conversationId: v.id("conversations"),
  userId: v.id("users"),
  toolCallId: v.string(),
  toolName: v.string(),
  args: v.any(),
  result: v.optional(v.any()),
  textPosition: v.optional(v.number()),
  isPartial: v.boolean(),
  timestamp: v.number(),
  createdAt: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_conversation", ["conversationId"])
  .index("by_user", ["userId"])
  .index("by_message_partial", ["messageId", "isPartial"]);

export const sourceMetadataTable = defineTable({
  urlHash: v.string(),
  url: v.string(),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  ogImage: v.optional(v.string()),
  favicon: v.optional(v.string()),
  siteName: v.optional(v.string()),
  enriched: v.boolean(),
  enrichedAt: v.optional(v.number()),
  enrichmentError: v.optional(v.string()),
  firstSeenAt: v.number(),
  lastAccessedAt: v.number(),
  accessCount: v.number(),
})
  .index("by_urlHash", ["urlHash"])
  .index("by_url", ["url"]);

export const sourcesTable = defineTable({
  messageId: v.id("messages"),
  conversationId: v.id("conversations"),
  userId: v.id("users"),
  position: v.number(),
  provider: v.string(),
  title: v.optional(v.string()),
  snippet: v.optional(v.string()),
  urlHash: v.string(),
  url: v.string(),
  isPartial: v.boolean(),
  createdAt: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_conversation", ["conversationId", "createdAt"])
  .index("by_urlHash", ["urlHash"])
  .index("by_user", ["userId", "createdAt"]);

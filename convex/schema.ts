import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    preferences: v.object({
      theme: v.union(v.literal("light"), v.literal("dark")),
      defaultModel: v.string(),
      sendOnEnter: v.boolean(),
      codeTheme: v.optional(v.string()),
      fontSize: v.optional(v.string()),
      customInstructions: v.optional(
        v.object({
          aboutUser: v.string(),
          responseStyle: v.string(),
          enabled: v.boolean(),
        }),
      ),
      // Search settings
      enableHybridSearch: v.optional(v.boolean()), // default false
      // Memory settings
      autoMemoryExtractEnabled: v.optional(v.boolean()), // default true
      autoMemoryExtractInterval: v.optional(v.number()), // default 5
      // Budget settings
      budgetHardLimitEnabled: v.optional(v.boolean()), // default true
      // UI settings
      alwaysShowMessageActions: v.optional(v.boolean()), // default false (show on hover)
    }),
    monthlyBudget: v.optional(v.number()),
    budgetAlertThreshold: v.optional(v.number()),
    dailyMessageLimit: v.optional(v.number()), // default 50
    dailyMessageCount: v.optional(v.number()),
    lastMessageDate: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    model: v.string(),
    pinned: v.boolean(),
    archived: v.boolean(),
    starred: v.boolean(),
    systemPrompt: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    lastMemoryExtractionAt: v.optional(v.number()),
    memoryExtractionMessageCount: v.optional(v.number()),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_pinned", ["userId", "pinned"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId", "archived"],
    }),

  messages: defineTable({
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
      v.literal("error"),
    ),
    model: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    cost: v.optional(v.number()),
    error: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())),
    attachments: v.optional(
      v.array(
        v.object({
          type: v.union(
            v.literal("file"),
            v.literal("image"),
            v.literal("audio"),
          ),
          name: v.string(),
          storageId: v.string(),
          mimeType: v.string(),
          size: v.number(),
        }),
      ),
    ),
    generationStartedAt: v.optional(v.number()),
    generationCompletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["conversationId", "userId"],
    })
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["conversationId", "userId", "role"],
    }),

  memories: defineTable({
    userId: v.id("users"),
    content: v.string(),
    embedding: v.array(v.number()),
    conversationId: v.optional(v.id("conversations")),
    metadata: v.optional(
      v.object({
        category: v.optional(v.string()),
        importance: v.optional(v.number()),
        tags: v.optional(v.array(v.string())),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId"],
    }),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    conversationIds: v.array(v.id("conversations")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  files: defineTable({
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"]),

  bookmarks: defineTable({
    userId: v.id("users"),
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    note: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_message", ["messageId"]),

  shares: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    shareId: v.string(),
    title: v.string(),
    expiresAt: v.optional(v.number()),
    isPublic: v.boolean(),
    viewCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_share_id", ["shareId"])
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"]),

  scheduledPrompts: defineTable({
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
    }),
    model: v.string(),
    isActive: v.boolean(),
    lastRunAt: v.optional(v.number()),
    nextRunAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_next_run", ["nextRunAt", "isActive"]),

  usageRecords: defineTable({
    userId: v.id("users"),
    date: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
    messageCount: v.number(),
    warningsSent: v.optional(v.array(v.string())),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user", ["userId"]),

  templates: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    prompt: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    isBuiltIn: v.boolean(),
    isPublic: v.boolean(),
    usageCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_category", ["category", "isBuiltIn"])
    .searchIndex("search_templates", {
      searchField: "name",
      filterFields: ["userId", "isBuiltIn", "category"],
    }),
});

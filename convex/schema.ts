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
          // New personalization fields
          baseStyleAndTone: v.optional(
            v.union(
              v.literal("default"),
              v.literal("professional"),
              v.literal("friendly"),
              v.literal("candid"),
              v.literal("quirky"),
              v.literal("efficient"),
              v.literal("nerdy"),
              v.literal("cynical"),
            ),
          ),
          nickname: v.optional(v.string()), // max 100 chars
          occupation: v.optional(v.string()), // max 200 chars
          moreAboutYou: v.optional(v.string()), // max 3000 chars
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
      // STT settings
      sttEnabled: v.optional(v.boolean()), // default true
      sttProvider: v.optional(
        v.union(
          v.literal("openai"),
          v.literal("deepgram"),
          v.literal("assemblyai"),
          v.literal("groq"),
        ),
      ), // default "openai"
      // TTS settings
      ttsEnabled: v.optional(v.boolean()), // default false
      ttsProvider: v.optional(v.string()), // "deepgram"
      ttsVoice: v.optional(v.string()),
      ttsSpeed: v.optional(v.number()), // default 1.0
      ttsAutoRead: v.optional(v.boolean()), // default false
      // Comparison settings
      showModelNamesDuringComparison: v.optional(v.boolean()), // default false
      // Reasoning display settings
      reasoning: v.optional(
        v.object({
          showByDefault: v.optional(v.boolean()), // default true
          autoExpand: v.optional(v.boolean()), // default false
          showDuringStreaming: v.optional(v.boolean()), // default true
        }),
      ),
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
    // Phase 2B: Memory caching
    cachedMemoryIds: v.optional(v.array(v.id("memories"))),
    lastMemoryFetchAt: v.optional(v.number()),
    // Incremental extraction cursor
    lastExtractedMessageId: v.optional(v.id("messages")),
    // Token usage tracking
    tokenUsage: v.optional(
      v.object({
        systemTokens: v.number(),
        messagesTokens: v.number(),
        memoriesTokens: v.number(),
        totalTokens: v.number(),
        contextLimit: v.number(),
        lastCalculatedAt: v.number(),
      }),
    ),
    messageCount: v.optional(v.number()),
    lastMessageAt: v.number(),
    // Branching support
    parentConversationId: v.optional(v.id("conversations")),
    parentMessageId: v.optional(v.id("messages")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_pinned", ["userId", "pinned"])
    .index("by_projectId", ["projectId"])
    .index("by_parent_conversation", ["parentConversationId"])
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
    // Reasoning/thinking support
    reasoning: v.optional(v.string()),
    partialReasoning: v.optional(v.string()),
    reasoningTokens: v.optional(v.number()),
    thinkingStartedAt: v.optional(v.number()),
    thinkingCompletedAt: v.optional(v.number()),
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
          metadata: v.optional(v.any()),
        }),
      ),
    ),
    // Tool calling support
    toolCalls: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          arguments: v.string(),
          result: v.optional(v.string()),
          timestamp: v.number(),
        }),
      ),
    ),
    partialToolCalls: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          arguments: v.string(),
          timestamp: v.number(),
        }),
      ),
    ),
    // Provider specific metadata (e.g. Gemini thought signatures)
    providerMetadata: v.optional(v.any()),
    // Branching support
    parentMessageId: v.optional(v.id("messages")),
    branchLabel: v.optional(v.string()),
    branchIndex: v.optional(v.number()),
    // Comparison support
    comparisonGroupId: v.optional(v.string()),
    consolidatedMessageId: v.optional(v.id("messages")), // Links to consolidated message
    isConsolidation: v.optional(v.boolean()), // Marks consolidated message
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
    firstTokenAt: v.optional(v.number()), // When first token received
    tokensPerSecond: v.optional(v.number()), // Calculated TPS
    // Memory extraction tracking
    memoryExtracted: v.optional(v.boolean()),
    memoryExtractedAt: v.optional(v.number()),
    // Source citations (Perplexity, web search models)
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
    sourceMessageId: v.optional(v.id("messages")), // Single extraction source
    sourceMessageIds: v.optional(v.array(v.id("messages"))), // Consolidated sources
    metadata: v.object({
      category: v.string(),
      importance: v.optional(v.number()), // 1-10 scale
      reasoning: v.optional(v.string()), // Why this memory is important
      extractedAt: v.optional(v.number()), // When extraction occurred
      sourceConversationId: v.optional(v.id("conversations")),
      // Phase 3: Confidence scoring
      confidence: v.optional(v.number()), // 0.0-1.0, extraction certainty
      verifiedBy: v.optional(
        v.union(
          v.literal("auto"),
          v.literal("manual"),
          v.literal("consolidated"),
        ),
      ),
      // Phase 3: TTL & versioning
      expiresAt: v.optional(v.number()), // timestamp, null = permanent
      version: v.optional(v.number()), // starts at 1, increments on edit
      supersededBy: v.optional(v.id("memories")), // points to newer version
      expirationHint: v.optional(
        v.union(
          v.literal("contextual"), // 7 days
          v.literal("preference"), // never
          v.literal("deadline"), // completion + 7 days
          v.literal("temporary"), // 1 day
        ),
      ),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_importance", ["userId", "metadata.importance"]) // Query by importance
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId"],
    })
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId", "metadata.category"],
    }),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    conversationIds: v.array(v.id("conversations")),
    isTemplate: v.optional(v.boolean()),
    createdFrom: v.optional(v.id("projects")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_userId_isTemplate", ["userId", "isTemplate"]),

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
    .index("by_message", ["messageId"])
    .index("by_conversation", ["conversationId"]),

  snippets: defineTable({
    userId: v.id("users"),
    text: v.string(),
    sourceMessageId: v.id("messages"),
    sourceConversationId: v.id("conversations"),
    note: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_message", ["sourceMessageId"])
    .index("by_conversation", ["sourceConversationId"])
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["userId"],
    }),

  notes: defineTable({
    userId: v.id("users"),
    title: v.string(), // auto-generated from first line or user-editable
    content: v.string(), // markdown (source of truth)
    htmlContent: v.optional(v.string()), // cached HTML for display

    // Source tracking (optional - message/conversation this came from)
    sourceMessageId: v.optional(v.id("messages")),
    sourceConversationId: v.optional(v.id("conversations")),
    sourceSelectionText: v.optional(v.string()), // original text if from summary

    // Metadata
    tags: v.optional(v.array(v.string())),
    suggestedTags: v.optional(v.array(v.string())), // AI-generated suggestions
    isPinned: v.boolean(),

    // Sharing
    shareId: v.optional(v.string()), // unique ID for public share URL
    isPublic: v.optional(v.boolean()),
    sharePassword: v.optional(v.string()), // SHA-256 hashed password
    shareExpiresAt: v.optional(v.number()), // expiration timestamp
    shareCreatedAt: v.optional(v.number()), // when share was created
    shareViewCount: v.optional(v.number()), // track view analytics

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]) // for recent notes sorting
    .index("by_source_message", ["sourceMessageId"]) // optional cleanup
    .index("by_share_id", ["shareId"]) // for public access
    .searchIndex("search_notes", {
      searchField: "content",
      filterFields: ["userId"],
    }),

  shares: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    shareId: v.string(),
    title: v.string(),
    expiresAt: v.optional(v.number()),
    isPublic: v.boolean(),
    isActive: v.boolean(), // Can be toggled to revoke access
    password: v.optional(v.string()), // bcrypt hashed
    anonymizeUsernames: v.optional(v.boolean()),
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
      timezone: v.string(), // "America/New_York"
    }),
    model: v.string(),
    projectId: v.optional(v.id("projects")),
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
    conversationId: v.optional(v.id("conversations")),
    inputTokens: v.number(),
    outputTokens: v.number(),
    reasoningTokens: v.optional(v.number()),
    cost: v.number(),
    messageCount: v.number(),
    warningsSent: v.optional(v.array(v.string())),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user", ["userId"])
    .index("by_user_date_model", ["userId", "date", "model"])
    .index("by_conversation", ["conversationId"]),

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

  votes: defineTable({
    userId: v.id("users"),
    comparisonGroupId: v.string(),
    winnerId: v.optional(v.id("messages")), // null for tie
    rating: v.union(
      v.literal("left_better"),
      v.literal("right_better"),
      v.literal("tie"),
      v.literal("both_bad"),
    ),
    votedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_comparison", ["comparisonGroupId"]),

  // Onboarding & Discoverability
  userOnboarding: defineTable({
    userId: v.id("users"),
    tourCompleted: v.boolean(),
    tourCompletedAt: v.optional(v.number()),
    tourSkipped: v.boolean(),
    tourSkippedAt: v.optional(v.number()),
    tourStep: v.optional(v.number()), // Resume from step if interrupted
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  dismissedHints: defineTable({
    userId: v.id("users"),
    featureId: v.string(), // "memory-extraction", "comparison-mode", etc.
    dismissedAt: v.number(),
    viewCount: v.number(), // How many times shown before dismissed
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_feature", ["userId", "featureId"]),

  userStats: defineTable({
    userId: v.id("users"),
    totalMessages: v.number(),
    totalConversations: v.number(),
    totalSearches: v.number(),
    totalBookmarks: v.number(),
    longMessageCount: v.number(), // Messages > 200 chars (for voice hint)
    messagesInCurrentConvo: v.number(), // For branching hint
    consecutiveSearches: v.number(), // For hybrid search hint
    promptPatternCount: v.any(), // Track repeated patterns for templates hint
    lastUpdated: v.number(),
  }).index("by_user", ["userId"]),
});

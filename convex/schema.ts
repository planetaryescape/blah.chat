import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()), // Admin role for accessing /admin routes
    // Daily message tracking (stored per user, limit from admin settings)
    dailyMessageCount: v.optional(v.number()),
    lastMessageDate: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Phase 4: Flatten user preferences into key-value table
  userPreferences: defineTable({
    userId: v.id("users"),
    category: v.union(
      v.literal("appearance"),
      v.literal("models"),
      v.literal("chat"),
      v.literal("audio"),
      v.literal("advanced"),
      v.literal("customInstructions"),
      v.literal("reasoning"),
    ),
    key: v.string(), // "theme", "defaultModel", "ttsEnabled", etc.
    value: v.any(), // string | boolean | number | object
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_category", ["userId", "category"])
    .index("by_user_key", ["userId", "key"]),

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
    // Collaborative conversations (multi-user)
    isCollaborative: v.optional(v.boolean()),
    // Model recommendation (cost optimization & decision guidance)
    modelRecommendation: v.optional(
      v.object({
        suggestedModelId: v.string(),
        currentModelId: v.string(),
        reasoning: v.string(), // User-friendly explanation
        estimatedSavings: v.object({
          costReduction: v.string(), // "$0.30 → $0.02"
          percentSaved: v.number(), // 93
        }),
        createdAt: v.number(),
        dismissed: v.boolean(),
      }),
    ),
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

  // Shared Conversations: Multi-user participants
  conversationParticipants: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("collaborator")),
    joinedAt: v.number(),
    invitedBy: v.optional(v.id("users")),
    sourceShareId: v.optional(v.string()), // Track which share link they joined from
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_user_conversation", ["userId", "conversationId"]),

  conversationTokenUsage: defineTable({
    conversationId: v.id("conversations"),
    model: v.string(), // "openai:gpt-oss-20B", "anthropic:claude-3-5-sonnet"
    totalTokens: v.number(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    reasoningTokens: v.optional(v.number()),
    messageCount: v.number(),
    lastUpdatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_model", ["conversationId", "model"]),

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
    model: v.optional(v.string()), // Required for assistant messages, validated in mutation
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
    // DEPRECATED (Phase 2): Source citations migrated to normalized tables
    // Fields kept for backward compatibility with existing messages in database
    // NO LONGER WRITTEN TO - see convex/sources/* for new implementation
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
    .index("by_conversation_created", ["conversationId", "createdAt"]) // Phase 7: Ordered messages
    .index("by_conversation_role", ["conversationId", "role"]) // Phase 7: Filter user/assistant
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["conversationId", "userId"],
    })
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["conversationId", "userId", "role"],
    }),

  // Phase 1: Normalized message attachments (extracted from messages.attachments[])
  attachments: defineTable({
    messageId: v.id("messages"),
    conversationId: v.id("conversations"), // Denormalized for efficient filtering
    userId: v.id("users"), // User scoping for multi-tenant queries
    type: v.union(v.literal("image"), v.literal("file"), v.literal("audio")),
    name: v.string(),
    storageId: v.id("_storage"), // Fixed: was string, now proper ID type
    mimeType: v.string(),
    size: v.number(),
    // Typed metadata (no more v.any())
    metadata: v.optional(
      v.object({
        // Image metadata
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        // Audio metadata
        duration: v.optional(v.number()),
        // Generated image metadata
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
    .index("by_storage", ["storageId"]), // Find which messages use a file

  // Phase 1: Normalized tool calls (consolidates toolCalls[] + partialToolCalls[])
  toolCalls: defineTable({
    messageId: v.id("messages"),
    conversationId: v.id("conversations"), // Denormalized for filtering
    userId: v.id("users"), // User scoping
    toolCallId: v.string(), // AI SDK-generated unique ID
    toolName: v.string(),
    args: v.any(), // Native JSON (not stringified) - matches AI SDK v5
    result: v.optional(v.any()), // Native JSON output
    textPosition: v.optional(v.number()), // Character position for inline display
    isPartial: v.boolean(), // Consolidates toolCalls vs partialToolCalls
    timestamp: v.number(),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_message_partial", ["messageId", "isPartial"]), // Query streaming state

  // Phase 2: Deduplicated source metadata by URL hash
  sourceMetadata: defineTable({
    urlHash: v.string(), // SHA-256(normalized_url).substring(0, 16)
    url: v.string(),

    // OpenGraph metadata
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    ogImage: v.optional(v.string()),
    favicon: v.optional(v.string()),
    siteName: v.optional(v.string()),

    // Enrichment tracking
    enriched: v.boolean(), // false on creation, true after fetch
    enrichedAt: v.optional(v.number()),
    enrichmentError: v.optional(v.string()),

    // Metrics
    firstSeenAt: v.number(),
    lastAccessedAt: v.number(),
    accessCount: v.number(), // how many sources reference this
  })
    .index("by_urlHash", ["urlHash"])
    .index("by_url", ["url"]),

  // Phase 2: Per-message source references
  sources: defineTable({
    messageId: v.id("messages"),
    conversationId: v.id("conversations"), // Denormalized for conversation queries
    userId: v.id("users"), // User scoping

    position: v.number(), // 1, 2, 3 for [1], [2], [3] citation markers
    provider: v.string(), // "openrouter" | "perplexity" | "generic" | "tool"

    // Provider-specific data (may differ from OG metadata)
    title: v.optional(v.string()),
    snippet: v.optional(v.string()),

    // Link to deduplicated metadata
    urlHash: v.string(),
    url: v.string(), // Denormalized for convenience

    isPartial: v.boolean(), // Future streaming support
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_urlHash", ["urlHash"])
    .index("by_user", ["userId", "createdAt"]),

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
    .index("by_conversation", ["conversationId"]) // Phase 7: Query memories by conversation
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
    isTemplate: v.optional(v.boolean()),
    createdFrom: v.optional(v.id("projects")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_userId_isTemplate", ["userId", "isTemplate"]),

  // Smart Manager Phase 1: Standalone tasks with project links
  tasks: defineTable({
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
    // Deadline fields
    deadline: v.optional(v.number()),
    deadlineSource: v.optional(v.string()), // "next Friday", "ASAP"
    urgency: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent"),
      ),
    ),
    tags: v.optional(v.array(v.string())), // Linear-style tags
    // Source tracking
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
    // Project association
    projectId: v.optional(v.id("projects")),
    priority: v.optional(v.number()),
    position: v.optional(v.number()), // For manual ordering
    // Completion tracking
    completedAt: v.optional(v.number()),
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
    }),

  projectConversations: defineTable({
    projectId: v.id("projects"),
    conversationId: v.id("conversations"),
    addedAt: v.number(),
    addedBy: v.id("users"),
  })
    .index("by_project", ["projectId"])
    .index("by_conversation", ["conversationId"])
    .index("by_project_conversation", ["projectId", "conversationId"]),

  // Smart Manager Phase 1: Project-Notes junction (many-to-many)
  projectNotes: defineTable({
    projectId: v.id("projects"),
    noteId: v.id("notes"),
    userId: v.id("users"),
    addedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_note", ["noteId"])
    .index("by_user_project", ["userId", "projectId"])
    .index("by_project_note", ["projectId", "noteId"]),

  // Smart Manager Phase 1: Project-Files junction (many-to-many)
  projectFiles: defineTable({
    projectId: v.id("projects"),
    fileId: v.id("files"),
    userId: v.id("users"),
    addedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_file", ["fileId"])
    .index("by_user_project", ["userId", "projectId"])
    .index("by_project_file", ["projectId", "fileId"]),

  files: defineTable({
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    // Smart Manager Phase 1: File RAG support
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
    .index("by_conversation", ["conversationId"]),

  // Smart Manager Phase 1: Document chunks for RAG
  fileChunks: defineTable({
    fileId: v.id("files"),
    userId: v.id("users"),
    chunkIndex: v.number(),
    content: v.string(),
    // Metadata
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
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "fileId"],
    }),

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
    .index("by_conversation", ["conversationId"])
    .index("by_user_created", ["userId", "createdAt"]), // Phase 7: Sorted recent bookmarks

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

    // Project association (Direct link)
    projectId: v.optional(v.id("projects")),

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
    .index("by_projectId", ["projectId"]) // for project stats and filtering
    .searchIndex("search_notes", {
      searchField: "content",
      filterFields: ["userId"],
    }),

  // Smart Manager Phase 1: Activity feed for projects and tasks
  activityEvents: defineTable({
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    eventType: v.string(), // "task_created", "task_completed", "note_linked", "file_uploaded", etc.
    // Resource reference
    resourceType: v.optional(
      v.union(
        v.literal("task"),
        v.literal("note"),
        v.literal("file"),
        v.literal("conversation"),
      ),
    ),
    resourceId: v.optional(v.string()),
    metadata: v.optional(v.any()), // Flexible metadata (task title, file name, etc.)
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_project_created", ["projectId", "createdAt"]),

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

  ttsCache: defineTable({
    hash: v.string(), // sha256 of text+voice+speed
    storageId: v.id("_storage"),
    text: v.string(),
    voice: v.string(),
    speed: v.number(),
    format: v.string(), // mp3, etc
    createdAt: v.number(),
    lastAccessedAt: v.number(),
  }).index("by_hash", ["hash"]),

  // User Feedback
  feedback: defineTable({
    userId: v.id("users"),
    userEmail: v.string(),
    userName: v.string(),
    page: v.string(), // URL path when feedback was submitted
    feedbackType: v.union(
      v.literal("bug"),
      v.literal("feature"),
      v.literal("praise"),
      v.literal("other"),
    ),
    description: v.string(), // Required: Main feedback text
    // Bug-specific fields
    whatTheyDid: v.optional(v.string()),
    whatTheySaw: v.optional(v.string()),
    whatTheyExpected: v.optional(v.string()),
    screenshotStorageId: v.optional(v.id("_storage")),

    // Type-specific status values
    status: v.union(
      // Bug statuses
      v.literal("new"),
      v.literal("triaging"),
      v.literal("in-progress"),
      v.literal("resolved"),
      v.literal("verified"),
      v.literal("closed"),
      v.literal("wont-fix"),
      v.literal("duplicate"),
      v.literal("cannot-reproduce"),
      // Feature statuses
      v.literal("submitted"),
      v.literal("under-review"),
      v.literal("planned"),
      v.literal("shipped"),
      v.literal("declined"),
      v.literal("maybe-later"),
      // Praise statuses
      v.literal("received"),
      v.literal("acknowledged"),
      v.literal("shared"),
      // General statuses
      v.literal("reviewed"),
      v.literal("actioned"),
    ),

    // Priority (admin-assigned)
    priority: v.optional(
      v.union(
        v.literal("critical"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
        v.literal("none"),
      ),
    ),
    // User-suggested urgency (when submitting)
    userSuggestedUrgency: v.optional(
      v.union(v.literal("urgent"), v.literal("normal"), v.literal("low")),
    ),

    // Tags for categorization
    tags: v.optional(v.array(v.string())),

    // AI Triage suggestions
    aiTriage: v.optional(
      v.object({
        suggestedPriority: v.string(),
        suggestedTags: v.array(v.string()),
        possibleDuplicateId: v.optional(v.id("feedback")),
        triageNotes: v.string(),
        createdAt: v.number(),
      }),
    ),

    // Assignment
    assignedTo: v.optional(v.id("users")),
    archivedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_type", ["feedbackType"])
    .index("by_created", ["createdAt"])
    .index("by_priority", ["priority"])
    .index("by_assigned", ["assignedTo"])
    .index("by_status_priority", ["status", "priority"]), // Phase 7: Admin filtered views

  // Phase 5: Centralized tags system (user-scoped with global support)
  tags: defineTable({
    // Normalization
    slug: v.string(), // Lowercase, trimmed: "important"
    displayName: v.string(), // Preserve casing: "Important"

    // Ownership & Scope
    userId: v.optional(v.id("users")), // null for global tags
    scope: v.union(
      v.literal("user"), // Personal tag
      v.literal("global"), // System tag (admin-managed)
    ),

    // Hierarchy (adjacency list pattern)
    parentId: v.optional(v.id("tags")),
    path: v.string(), // "/parent/child" for fast queries
    depth: v.number(), // 0 = root

    // Metadata
    usageCount: v.number(), // Denormalized for sorting
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())), // Semantic vector for similarity matching

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_slug", ["userId", "slug"]) // Uniqueness + autocomplete
    .index("by_user_usage", ["userId", "usageCount"]) // Popular tags
    .index("by_scope", ["scope"]) // Global tags query
    .index("by_parent", ["parentId"]) // Children lookup
    .index("by_user_path", ["userId", "path"]), // Hierarchy queries

  // Phase 5: Junction tables for many-to-many tag relationships
  bookmarkTags: defineTable({
    bookmarkId: v.id("bookmarks"),
    tagId: v.id("tags"),
    userId: v.id("users"), // Denormalized for fast filtering
    createdAt: v.number(),
  })
    .index("by_bookmark", ["bookmarkId"])
    .index("by_tag", ["tagId"])
    .index("by_user", ["userId"])
    .index("by_bookmark_tag", ["bookmarkId", "tagId"]), // Uniqueness

  snippetTags: defineTable({
    snippetId: v.id("snippets"),
    tagId: v.id("tags"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_snippet", ["snippetId"])
    .index("by_tag", ["tagId"])
    .index("by_user", ["userId"])
    .index("by_snippet_tag", ["snippetId", "tagId"]),

  noteTags: defineTable({
    noteId: v.id("notes"),
    tagId: v.id("tags"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_note", ["noteId"])
    .index("by_tag", ["tagId"])
    .index("by_user", ["userId"])
    .index("by_note_tag", ["noteId", "tagId"]),

  feedbackTagJunctions: defineTable({
    feedbackId: v.id("feedback"),
    tagId: v.id("tags"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_tag", ["tagId"])
    .index("by_user", ["userId"])
    .index("by_feedback_tag", ["feedbackId", "tagId"]),

  // Smart Manager Phase 1: Task-Tags junction (many-to-many)
  taskTags: defineTable({
    taskId: v.id("tasks"),
    tagId: v.id("tags"),
    userId: v.id("users"),
    addedAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_tag", ["tagId"])
    .index("by_user", ["userId"])
    .index("by_task_tag", ["taskId", "tagId"]),

  // DEPRECATED: Phase 5 migrated to centralized tags table with scope: "global"
  // Kept for backward compatibility during migration. New code uses tags table.
  feedbackTags: defineTable({
    name: v.string(),
    color: v.optional(v.string()),
    usageCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_usage", ["usageCount"]),

  // Shared Conversations: Global notification system
  notifications: defineTable({
    userId: v.id("users"), // Recipient
    type: v.string(), // "collaboration_joined", "mention", etc.
    title: v.string(),
    message: v.string(),
    data: v.optional(
      v.object({
        conversationId: v.optional(v.id("conversations")),
        joinedUserId: v.optional(v.id("users")),
        joinedUserName: v.optional(v.string()),
      }),
    ),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"])
    .index("by_created", ["createdAt"]), // For cleanup cron

  // Admin Settings (global platform settings)
  adminSettings: defineTable({
    // Memory extraction
    autoMemoryExtractEnabled: v.boolean(),
    autoMemoryExtractInterval: v.number(),

    // Search settings
    enableHybridSearch: v.boolean(),

    // Budget settings
    defaultMonthlyBudget: v.number(),
    defaultBudgetAlertThreshold: v.number(),
    budgetHardLimitEnabled: v.boolean(),

    // Message limits
    defaultDailyMessageLimit: v.number(),

    // Email alerts
    alertEmail: v.string(),

    // Telemetry (self-hosted instances)
    instanceId: v.optional(v.string()), // Anonymous UUID for telemetry

    // Future: General settings, Features

    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }),

  // Email Alerts (for rate limiting notifications)
  emailAlerts: defineTable({
    type: v.union(
      v.literal("budget_80_percent"),
      v.literal("budget_exceeded"),
      v.literal("api_credits_exhausted"),
    ),
    recipientEmail: v.string(),
    sentAt: v.number(),
    metadata: v.optional(
      v.object({
        budgetAmount: v.optional(v.number()),
        spentAmount: v.optional(v.number()),
        errorMessage: v.optional(v.string()),
        modelId: v.optional(v.string()),
      }),
    ),
  }).index("by_type_sent", ["type", "sentAt"]),

  // Migration State Tracking (Stripe pattern - resumable migrations)
  migrations: defineTable({
    migrationId: v.string(), // e.g., "001_normalize_message_attachments"
    name: v.string(), // Human-readable name
    phase: v.union(
      v.literal("schema"),
      v.literal("backfill"),
      v.literal("dual-write"),
      v.literal("dual-read"),
      v.literal("cleanup"),
      v.literal("complete"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("rolled-back"),
    ),
    // Resumability checkpoint (cursor position, counts, etc.)
    checkpoint: v.optional(
      v.object({
        cursor: v.optional(v.string()),
        processedCount: v.number(),
        successCount: v.number(),
        errorCount: v.number(),
        lastProcessedId: v.optional(v.string()),
      }),
    ),
    // Progress tracking
    totalRecords: v.optional(v.number()), // Estimated total
    processedRecords: v.number(), // Current progress
    // Metadata
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    executedBy: v.optional(v.string()), // Admin user or system
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_migration_id", ["migrationId"])
    .index("by_status", ["status"])
    .index("by_phase", ["phase"]),

  // Phase 4: Long-running operations job tracking
  jobs: defineTable({
    // Identity
    userId: v.id("users"),
    type: v.union(
      v.literal("search"),
      v.literal("extractMemories"),
      v.literal("transcribe"),
      v.literal("embedFile"),
      v.literal("analyzeVideo"),
    ),

    // Status tracking
    status: v.union(
      v.literal("pending"), // Queued, not started
      v.literal("running"), // Action executing
      v.literal("completed"), // Success
      v.literal("failed"), // Error
      v.literal("cancelled"), // User/system cancelled
    ),

    // Progress (optional, future enhancement)
    progress: v.optional(
      v.object({
        current: v.number(), // 0-100
        message: v.string(), // "Processing chunk 3/10"
        eta: v.optional(v.number()), // Timestamp
      }),
    ),

    // Input/output
    input: v.any(), // Original request payload
    result: v.optional(v.any()), // Success result
    error: v.optional(
      v.object({
        message: v.string(),
        code: v.optional(v.string()),
        details: v.optional(v.any()),
      }),
    ),

    // Timing
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    expiresAt: v.number(), // Auto-delete after this

    // Metadata
    retryCount: v.number(),
    metadata: v.optional(
      v.object({
        conversationId: v.optional(v.id("conversations")),
        fileId: v.optional(v.id("files")),
        cost: v.optional(v.number()),
      }),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status_expires", ["status", "expiresAt"])
    .index("by_type_status", ["type", "status"])
    .index("by_expires", ["expiresAt"]),
});

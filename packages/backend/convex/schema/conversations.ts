/**
 * Conversations table module
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const conversationsTable = defineTable({
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
  // Incognito mode (ephemeral conversations)
  isIncognito: v.optional(v.boolean()),
  incognitoSettings: v.optional(
    v.object({
      enableReadTools: v.boolean(),
      applyCustomInstructions: v.boolean(),
      inactivityTimeoutMinutes: v.optional(v.number()),
      scheduledDeletionId: v.optional(v.id("_scheduled_functions")),
      lastActivityAt: v.number(),
    }),
  ),
  // Presentation mode (slides feature conversations)
  isPresentation: v.optional(v.boolean()),
  // Enable web search grounding for presentations
  enableGrounding: v.optional(v.boolean()),
  // Presentation metadata
  slideStyle: v.optional(
    v.union(v.literal("wordy"), v.literal("illustrative")),
  ),
  imageStyle: v.optional(v.string()),
  aspectRatio: v.optional(
    v.union(v.literal("16:9"), v.literal("1:1"), v.literal("9:16")),
  ),
  templateId: v.optional(v.id("templates")),
  // Model recommendation (cost optimization & decision guidance)
  modelRecommendation: v.optional(
    v.object({
      suggestedModelId: v.string(),
      currentModelId: v.string(),
      reasoning: v.string(),
      estimatedSavings: v.object({
        costReduction: v.string(),
        percentSaved: v.number(),
      }),
      createdAt: v.number(),
      dismissed: v.boolean(),
    }),
  ),
  // Document mode (Canvas)
  mode: v.optional(v.union(v.literal("document"), v.literal("normal"))),
  modeActivatedAt: v.optional(v.number()),
  // Cached system prompt (built in background on creation/input changes)
  cachedSystemPrompt: v.optional(v.string()),
  promptInputHash: v.optional(v.string()),
  promptBuiltAt: v.optional(v.number()),
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
  });

export const conversationParticipantsTable = defineTable({
  conversationId: v.id("conversations"),
  userId: v.id("users"),
  role: v.union(v.literal("owner"), v.literal("collaborator")),
  joinedAt: v.number(),
  invitedBy: v.optional(v.id("users")),
  sourceShareId: v.optional(v.string()),
})
  .index("by_conversation", ["conversationId"])
  .index("by_user", ["userId"])
  .index("by_user_conversation", ["userId", "conversationId"]);

export const conversationTokenUsageTable = defineTable({
  conversationId: v.id("conversations"),
  model: v.string(),
  totalTokens: v.number(),
  inputTokens: v.number(),
  outputTokens: v.number(),
  reasoningTokens: v.optional(v.number()),
  messageCount: v.number(),
  lastUpdatedAt: v.number(),
  createdAt: v.number(),
})
  .index("by_conversation", ["conversationId"])
  .index("by_conversation_model", ["conversationId", "model"]);

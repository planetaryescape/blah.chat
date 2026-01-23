/**
 * Convex Internal Query Helpers
 *
 * These internal queries solve TypeScript's "Type instantiation is excessively deep"
 * errors by providing simple, focused queries that can be called from actions.
 *
 * Benefits:
 * - No type instantiation depth errors (simpler type signatures)
 * - Reusable across multiple actions
 * - Follows Convex best practices
 * - Easier to test and maintain
 *
 * Usage in actions:
 * ```typescript
 * import { internal } from "../_generated/api";
 *
 * const user = await ctx.runQuery(internal.lib.helpers.getCurrentUser, {});
 * const conversation = await ctx.runQuery(internal.lib.helpers.getConversation, { id });
 * ```
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";

/**
 * Get current authenticated user
 * Replaces: ctx.runQuery(api.users.getCurrentUser, {})
 */
export const getCurrentUser = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"users"> | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

/**
 * Get conversation by ID
 * Replaces: ctx.runQuery(internal.conversations.getInternal, { id })
 */
export const getConversation = internalQuery({
  args: { id: v.id("conversations") },
  handler: async (ctx, args): Promise<Doc<"conversations"> | null> => {
    return await ctx.db.get(args.id);
  },
});

/**
 * List messages for a conversation
 * Replaces: ctx.runQuery(internal.messages.listInternal, { conversationId })
 *
 * P7 Tree Architecture: By default returns only active branch messages.
 * Set includeAllBranches: true to get the full tree.
 */
export const getConversationMessages = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    includeAllBranches: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<Doc<"messages">[]> => {
    if (args.includeAllBranches) {
      // Return all messages for tree visualization
      return await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", args.conversationId),
        )
        .order("asc")
        .collect();
    }

    // P7: Return only active branch messages
    // First try to use the index for active branch
    const activeMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_active", (q) =>
        q.eq("conversationId", args.conversationId).eq("isActiveBranch", true),
      )
      .collect();

    // If we got results from active index, return them sorted
    if (activeMessages.length > 0) {
      return activeMessages.sort((a, b) => a.createdAt - b.createdAt);
    }

    // Fallback for un-migrated conversations: return all messages
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();
  },
});

/**
 * Get project by ID
 * Replaces: ctx.runQuery(internal.projects.getInternal, { id })
 */
export const getProject = internalQuery({
  args: { id: v.id("projects") },
  handler: async (ctx, args): Promise<Doc<"projects"> | null> => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get memories by IDs (batch operation)
 * Replaces: ctx.runQuery(internal.memories.getMemoriesByIds, { ids })
 */
export const getMemoriesByIds = internalQuery({
  args: { ids: v.array(v.id("memories")) },
  handler: async (ctx, args): Promise<Doc<"memories">[]> => {
    const results = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return results.filter((m): m is Doc<"memories"> => m !== null);
  },
});

/**
 * Get conversations by IDs (batch operation)
 * Replaces: ctx.db.get() batch calls in actions
 */
export const getConversationsByIds = internalQuery({
  args: { ids: v.array(v.id("conversations")) },
  handler: async (ctx, args): Promise<Doc<"conversations">[]> => {
    const results = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return results.filter((c): c is Doc<"conversations"> => c !== null);
  },
});

/**
 * Get single memory by ID
 * Replaces: ctx.runQuery(internal.memories.getMemoryById, { id })
 */
export const getMemoryById = internalQuery({
  args: { id: v.id("memories") },
  handler: async (ctx, args): Promise<Doc<"memories"> | null> => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get feedback by ID
 * Replaces: ctx.runQuery(internal.feedback.getFeedbackInternal, { feedbackId })
 */
export const getFeedback = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args): Promise<Doc<"feedback"> | null> => {
    return await ctx.db.get(args.feedbackId);
  },
});

/**
 * Get note by ID
 * Replaces: ctx.runQuery(internal.notes.getInternal, { noteId })
 */
export const getNote = internalQuery({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args): Promise<Doc<"notes"> | null> => {
    return await ctx.db.get(args.noteId);
  },
});

/**
 * Get tag by ID
 * Replaces: ctx.runQuery(internal.tags.getInternal, { tagId })
 */
export const getTag = internalQuery({
  args: { tagId: v.id("tags") },
  handler: async (ctx, args): Promise<Doc<"tags"> | null> => {
    return await ctx.db.get(args.tagId);
  },
});

/**
 * List all memories for current user
 * Replaces: ctx.runQuery(api.memories.listAll, {})
 */
export const listAllMemories = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<Doc<"memories">[]> => {
    return await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Get message by ID
 * Replaces: ctx.runQuery(internal.messages.getInternal, { id })
 */
export const getMessage = internalQuery({
  args: { id: v.id("messages") },
  handler: async (ctx, args): Promise<Doc<"messages"> | null> => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get attachments for a message
 * Replaces: ctx.db.query("attachments").withIndex("by_message", ...)
 */
export const getMessageAttachments = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args): Promise<Doc<"attachments">[]> => {
    return await ctx.db
      .query("attachments")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
  },
});

/**
 * Get attachments for multiple messages (batch operation)
 * Optimizes O(n) queries to O(n) parallel fetches in single query call
 * Returns all attachments for all message IDs (caller groups by messageId)
 */
export const getAttachmentsByMessageIds = internalQuery({
  args: { messageIds: v.array(v.id("messages")) },
  handler: async (ctx, args): Promise<Doc<"attachments">[]> => {
    // Parallel fetch for each message (still O(n) but in parallel, single round-trip)
    const results = await Promise.all(
      args.messageIds.map((messageId) =>
        ctx.db
          .query("attachments")
          .withIndex("by_message", (q) => q.eq("messageId", messageId))
          .collect(),
      ),
    );
    return results.flat();
  },
});

/**
 * Get task by ID (Smart Manager Phase 2)
 * Replaces: ctx.runQuery(internal.tasks.getInternal, { taskId })
 */
export const getTask = internalQuery({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args): Promise<Doc<"tasks"> | null> => {
    return await ctx.db.get(args.taskId);
  },
});

/**
 * Get file by ID (Smart Manager Phase 4)
 * Replaces: ctx.runQuery(internal.files.getInternal, { fileId })
 */
export const getFile = internalQuery({
  args: { fileId: v.id("files") },
  handler: async (ctx, args): Promise<Doc<"files"> | null> => {
    return await ctx.db.get(args.fileId);
  },
});

/**
 * Get file chunk by ID (Smart Manager Phase 4)
 * Replaces: ctx.runQuery(internal.files.getChunk, { chunkId })
 */
export const getFileChunk = internalQuery({
  args: { chunkId: v.id("fileChunks") },
  handler: async (ctx, args): Promise<Doc<"fileChunks"> | null> => {
    return await ctx.db.get(args.chunkId);
  },
});

/**
 * Get API key availability (which keys are configured)
 * Returns boolean flags only, never exposes actual key values
 * Replaces: internal.settings.apiKeys.getApiKeyAvailabilityInternal
 */
export const getApiKeyAvailability = internalQuery({
  args: {},
  handler: async (ctx) => {
    const isProduction = process.env.NODE_ENV === "production";

    // Get current admin-selected STT provider
    const adminSettings = await ctx.db.query("adminSettings").first();
    const currentSTTProvider = adminSettings?.transcriptProvider || "groq";

    // Dynamically check current provider's key
    const providerKeyMap: Record<string, string> = {
      groq: "GROQ_API_KEY",
      openai: "OPENAI_API_KEY",
      deepgram: "DEEPGRAM_API_KEY",
      assemblyai: "ASSEMBLYAI_API_KEY",
    };

    const currentProviderKeyName = providerKeyMap[currentSTTProvider];
    const hasCurrentProviderKey = !!process.env[currentProviderKeyName];

    return {
      stt: {
        // Individual provider availability
        groq: !!process.env.GROQ_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        deepgram: !!process.env.DEEPGRAM_API_KEY,
        assemblyai: !!process.env.ASSEMBLYAI_API_KEY,

        // Current admin selection
        currentProvider: currentSTTProvider,
        currentProviderKeyName,
        hasCurrentProviderKey,
      },
      tts: {
        // TTS currently uses Deepgram exclusively
        deepgram: !!process.env.DEEPGRAM_API_KEY,
      },
      isProduction,
    };
  },
});

/**
 * Get recent conversations for a user (for batch prompt rebuilds)
 * Used by prompts/cache.ts for rebuilding cached prompts
 */
export const getRecentConversations = internalQuery({
  args: {
    userId: v.id("users"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("lastMessageAt"), args.since))
      .collect();
  },
});

/**
 * Get feature toggle preferences for a user
 * Used by search actions to filter out disabled features
 */
export const getFeatureToggles = internalQuery({
  args: { userId: v.id("users") },
  handler: async (
    ctx,
    args,
  ): Promise<{ showTasks: boolean; showSmartAssistant: boolean }> => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const prefMap = new Map(prefs.map((p) => [p.key, p.value]));

    return {
      showTasks: (prefMap.get("showTasks") as boolean) ?? true,
      showSmartAssistant:
        (prefMap.get("showSmartAssistant") as boolean) ?? true,
    };
  },
});

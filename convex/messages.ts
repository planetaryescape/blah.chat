import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { getCurrentUser } from "./lib/userSync";

export * as embeddings from "./messages/embeddings";

export const get = internalQuery({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

export const create = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
    ),
    content: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("generating"),
        v.literal("complete"),
        v.literal("stopped"),
        v.literal("error"),
      ),
    ),
    model: v.optional(v.string()),
    comparisonGroupId: v.optional(v.string()), // NEW: For comparison mode
    // Branching support
    parentMessageId: v.optional(v.id("messages")),
    branchIndex: v.optional(v.number()),
    branchLabel: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    // Validate: assistant messages must have model specified
    if (args.role === "assistant" && !args.model) {
      throw new Error("Assistant messages must have model specified");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: args.userId,
      role: args.role,
      content: args.content || "",
      status: args.status || "complete",
      model: args.model,
      comparisonGroupId: args.comparisonGroupId,
      parentMessageId: args.parentMessageId,
      branchIndex: args.branchIndex,
      branchLabel: args.branchLabel,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Store attachments in normalized table
    if (args.attachments && args.attachments.length > 0) {
      for (const attachment of args.attachments) {
        await ctx.db.insert("attachments", {
          messageId,
          conversationId: args.conversationId,
          userId: args.userId,
          type: attachment.type,
          name: attachment.name,
          storageId: attachment.storageId as Id<"_storage">,
          mimeType: attachment.mimeType,
          size: attachment.size,
          createdAt: Date.now(),
        });
      }
    }

    // Increment conversation messageCount
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation) {
      await ctx.db.patch(args.conversationId, {
        messageCount: (conversation.messageCount || 0) + 1,
      });
    }

    // Update user stats for progressive hints (only for user messages)
    if (args.role === "user" && args.content) {
      const stats = await ctx.db
        .query("userStats")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();

      const isLongMessage = args.content.length > 200;

      if (stats) {
        await ctx.db.patch(stats._id, {
          totalMessages: stats.totalMessages + 1,
          longMessageCount: isLongMessage
            ? stats.longMessageCount + 1
            : stats.longMessageCount,
          messagesInCurrentConvo: stats.messagesInCurrentConvo + 1,
          lastUpdated: Date.now(),
        });
      } else {
        // Auto-create stats if missing
        await ctx.db.insert("userStats", {
          userId: args.userId,
          totalMessages: 1,
          totalConversations: 0,
          totalSearches: 0,
          totalBookmarks: 0,
          longMessageCount: isLongMessage ? 1 : 0,
          messagesInCurrentConvo: 1,
          consecutiveSearches: 0,
          promptPatternCount: {},
          lastUpdated: Date.now(),
        });
      }
    }

    // Schedule embedding generation for complete messages with content
    if (
      args.status === "complete" &&
      args.content &&
      args.content.trim().length > 0
    ) {
      await (ctx.scheduler.runAfter as any)(
        0,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.messages.embeddings.generateEmbedding,
        {
          messageId,
          content: args.content,
        },
      );
    }

    return messageId;
  },
});

export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    // Security: Verify user owns the conversation OR is a participant
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];

    // Check ownership or participant access for collaborative conversations
    let hasAccess = conversation.userId === user._id;
    if (!hasAccess && conversation.isCollaborative) {
      const participant = await ctx.db
        .query("conversationParticipants")
        .withIndex("by_user_conversation", (q) =>
          q.eq("userId", user._id).eq("conversationId", args.conversationId),
        )
        .first();
      hasAccess = participant !== null;
    }

    if (!hasAccess) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();

    return messages;
  },
});

/**
 * List messages with sender user info (for collaborative conversations)
 */
export const listWithUsers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];

    // Check access
    let hasAccess = conversation.userId === user._id;
    if (!hasAccess && conversation.isCollaborative) {
      const participant = await ctx.db
        .query("conversationParticipants")
        .withIndex("by_user_conversation", (q) =>
          q.eq("userId", user._id).eq("conversationId", args.conversationId),
        )
        .first();
      hasAccess = participant !== null;
    }

    if (!hasAccess) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();

    // Fetch user info for each message
    const messagesWithUsers = await Promise.all(
      messages.map(async (msg) => {
        const sender = msg.userId ? await ctx.db.get(msg.userId) : null;
        return {
          ...msg,
          senderUser: sender
            ? { name: sender.name, imageUrl: sender.imageUrl }
            : null,
        };
      }),
    );

    return messagesWithUsers;
  },
});

/**
 * List messages with pagination (mobile-optimized)
 *
 * Fetches messages in batches to prevent loading 1000+ messages at once.
 * Uses Convex's built-in pagination with cursor-based approach.
 *
 * @param conversationId - Conversation to fetch messages from
 * @param paginationOpts - Pagination options (numItems, cursor, etc)
 * @returns Paginated messages result
 */
export const listPaginated = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // Security: Verify user owns OR is participant
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    // Check ownership or participant access
    let hasAccess = conversation.userId === user._id;
    if (!hasAccess && conversation.isCollaborative) {
      const participant = await ctx.db
        .query("conversationParticipants")
        .withIndex("by_user_conversation", (q) =>
          q.eq("userId", user._id).eq("conversationId", args.conversationId),
        )
        .first();
      hasAccess = participant !== null;
    }

    if (!hasAccess) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    // Fetch paginated messages (oldest first, so client can reverse)
    const result = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .paginate({
        ...args.paginationOpts,
        cursor: args.paginationOpts.cursor ?? null,
      });

    return result;
  },
});

export const listInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();

    return messages;
  },
});

export const updateStatus = internalMutation({
  args: {
    messageId: v.id("messages"),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("complete"),
      v.literal("stopped"),
      v.literal("error"),
    ),
    generationStartedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: args.status,
      generationStartedAt: args.generationStartedAt,
      updatedAt: Date.now(),
    });
  },
});

export const updatePartialContent = internalMutation({
  args: {
    messageId: v.id("messages"),
    partialContent: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      partialContent: args.partialContent,
      status: "generating",
      updatedAt: Date.now(),
    });
  },
});

export const markThinkingStarted = internalMutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      thinkingStartedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updatePartialReasoning = internalMutation({
  args: {
    messageId: v.id("messages"),
    partialReasoning: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      partialReasoning: args.partialReasoning,
      updatedAt: Date.now(),
    });
  },
});

export const updateMetrics = internalMutation({
  args: {
    messageId: v.id("messages"),
    firstTokenAt: v.optional(v.number()),
    tokensPerSecond: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      firstTokenAt: args.firstTokenAt,
      tokensPerSecond: args.tokensPerSecond,
      updatedAt: Date.now(),
    });
  },
});

export const completeThinking = internalMutation({
  args: {
    messageId: v.id("messages"),
    reasoning: v.string(),
    reasoningTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      reasoning: args.reasoning,
      partialReasoning: undefined,
      thinkingCompletedAt: Date.now(),
      reasoningTokens: args.reasoningTokens,
      updatedAt: Date.now(),
    });
  },
});

export const completeMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    reasoning: v.optional(v.string()),
    inputTokens: v.number(),
    outputTokens: v.number(),
    reasoningTokens: v.optional(v.number()),
    cost: v.number(),
    tokensPerSecond: v.optional(v.number()),
    // sources: removed - now using normalized tables only (Phase 2 complete)
    providerMetadata: v.optional(v.any()), // New field for thought signatures
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await ctx.db.patch(args.messageId, {
      content: args.content,
      reasoning: args.reasoning,
      partialContent: undefined,
      partialReasoning: undefined,
      status: "complete",
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      reasoningTokens: args.reasoningTokens,
      cost: args.cost,
      tokensPerSecond: args.tokensPerSecond,
      providerMetadata: args.providerMetadata, // Save provider metadata
      generationCompletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Record usage to usageRecords table
    if (message.model && message.userId && args.cost > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.usage.mutations.recordTextGeneration,
        {
          userId: message.userId,
          conversationId: message.conversationId,
          model: message.model,
          inputTokens: args.inputTokens,
          outputTokens: args.outputTokens,
          reasoningTokens: args.reasoningTokens,
          cost: args.cost,
        },
      );

      // Update conversation token usage (Phase 6: per-model tracking + dual-write)
      await ctx.scheduler.runAfter(
        0,
        internal.conversations.updateConversationTokenUsage,
        {
          conversationId: message.conversationId,
          model: message.model,
          inputTokens: args.inputTokens,
          outputTokens: args.outputTokens,
          reasoningTokens: args.reasoningTokens,
        },
      );
    }

    // Schedule embedding generation for completed assistant message
    if (args.content && args.content.trim().length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.messages.embeddings.generateEmbedding,
        {
          messageId: args.messageId,
          content: args.content,
        },
      );
    }
  },
});

export const updatePartialToolCalls = internalMutation({
  args: {
    messageId: v.id("messages"),
    partialToolCalls: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        arguments: v.string(),
        result: v.optional(v.string()),
        timestamp: v.number(),
        textPosition: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      updatedAt: Date.now(),
    });
  },
});

export const markError = internalMutation({
  args: {
    messageId: v.id("messages"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    // Don't override "stopped" status - user intentionally cancelled
    const message = await ctx.db.get(args.messageId);
    if (message?.status === "stopped") return;

    await ctx.db.patch(args.messageId, {
      status: "error",
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const updatePartial = internalMutation({
  args: {
    messageId: v.id("messages"),
    updates: v.object({
      error: v.optional(v.string()),
      metadata: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      ...args.updates,
      updatedAt: Date.now(),
    });
  },
});

export const addAttachment = internalMutation({
  args: {
    messageId: v.id("messages"),
    attachment: v.object({
      type: v.union(v.literal("file"), v.literal("image"), v.literal("audio")),
      storageId: v.string(),
      name: v.string(),
      size: v.number(),
      mimeType: v.string(),
      metadata: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await ctx.db.insert("attachments", {
      messageId: args.messageId,
      conversationId: message.conversationId,
      userId: message.userId!,
      type: args.attachment.type,
      name: args.attachment.name,
      storageId: args.attachment.storageId as Id<"_storage">,
      mimeType: args.attachment.mimeType,
      size: args.attachment.size,
      metadata: args.attachment.metadata,
      createdAt: Date.now(),
    });
  },
});

// Add tool calls to message
export const addToolCalls = internalMutation({
  args: {
    messageId: v.id("messages"),
    toolCalls: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        arguments: v.string(),
        result: v.optional(v.string()),
        timestamp: v.number(),
        textPosition: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    for (const tc of args.toolCalls) {
      await ctx.db.insert("toolCalls", {
        messageId: args.messageId,
        conversationId: message.conversationId,
        userId: message.userId!,
        toolCallId: tc.id,
        toolName: tc.name,
        args: JSON.parse(tc.arguments),
        result: tc.result ? JSON.parse(tc.result) : undefined,
        textPosition: tc.textPosition,
        isPartial: false,
        timestamp: tc.timestamp,
        createdAt: Date.now(),
      });
    }
  },
});

// ============================================================================
// Phase 1 Migration: Dual-Write Mutations (attachments + tool calls)
// ============================================================================

/**
 * Upsert tool call to new table + old structure (dual-write).
 * Used during streaming to persist tool call state.
 */
export const upsertToolCall = internalMutation({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    toolCallId: v.string(),
    toolName: v.string(),
    args: v.any(), // Native JSON
    result: v.optional(v.any()),
    textPosition: v.optional(v.number()),
    isPartial: v.boolean(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Upsert to toolCalls table
    const existing = await ctx.db
      .query("toolCalls")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .filter((q) => q.eq(q.field("toolCallId"), args.toolCallId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        args: args.args,
        result: args.result,
        isPartial: args.isPartial,
        timestamp: args.timestamp,
      });
    } else {
      await ctx.db.insert("toolCalls", {
        messageId: args.messageId,
        conversationId: args.conversationId,
        userId: args.userId,
        toolCallId: args.toolCallId,
        toolName: args.toolName,
        args: args.args,
        result: args.result,
        textPosition: args.textPosition,
        isPartial: args.isPartial,
        timestamp: args.timestamp,
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Mark all partial tool calls as complete (on stream finish).
 */
export const finalizeToolCalls = internalMutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const partials = await ctx.db
      .query("toolCalls")
      .withIndex("by_message_partial", (q) =>
        q.eq("messageId", args.messageId).eq("isPartial", true),
      )
      .collect();

    for (const tc of partials) {
      await ctx.db.patch(tc._id, { isPartial: false });
    }
  },
});

// ============================================================================
// Query Helpers (attachments + tool calls)
// ============================================================================

/**
 * Get message attachments from normalized table.
 */
async function getMessageAttachments(ctx: any, messageId: any): Promise<any[]> {
  return await ctx.db
    .query("attachments")
    .withIndex("by_message", (q: any) => q.eq("messageId", messageId))
    .collect();
}

/**
 * Get message tool calls from normalized table.
 */
async function getMessageToolCalls(
  ctx: any,
  messageId: any,
  includePartial = false,
): Promise<any[]> {
  const toolCalls = await ctx.db
    .query("toolCalls")
    .withIndex("by_message", (q: any) => q.eq("messageId", messageId))
    .collect();

  const filtered = includePartial
    ? toolCalls
    : toolCalls.filter((tc: any) => !tc.isPartial);

  // Transform database format to component format
  return filtered.map((tc: any) => ({
    id: tc.toolCallId,
    name: tc.toolName,
    arguments: JSON.stringify(tc.args),
    result: tc.result ? JSON.stringify(tc.result) : undefined,
    timestamp: tc.timestamp,
    textPosition: tc.textPosition,
    isPartial: tc.isPartial,
  }));
}

// Export queries for frontend
export const getAttachments = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    return getMessageAttachments(ctx, messageId);
  },
});

export const getToolCalls = query({
  args: {
    messageId: v.id("messages"),
    includePartial: v.optional(v.boolean()),
  },
  handler: async (ctx, { messageId, includePartial }) => {
    return getMessageToolCalls(ctx, messageId, includePartial);
  },
});

// ============================================================================
// End Phase 1 Migration Helpers
// ============================================================================

// Get all messages in a comparison group
export const getComparisonGroup = query({
  args: { comparisonGroupId: v.string() },
  handler: async (ctx, { comparisonGroupId }) => {
    // Security: Verify user owns the conversation containing these messages
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_comparison_group", (q) =>
        q.eq("comparisonGroupId", comparisonGroupId),
      )
      .collect();

    // Verify ownership of the conversation
    if (messages.length > 0) {
      const conversation = await ctx.db.get(messages[0].conversationId);
      if (!conversation || conversation.userId !== user._id) {
        return [];
      }
    }

    return messages;
  },
});

// Get original assistant responses linked to a consolidated message
export const getOriginalResponses = query({
  args: { consolidatedMessageId: v.id("messages") },
  handler: async (ctx, { consolidatedMessageId }) => {
    // Security: Verify user owns the conversation containing this message
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // First verify ownership of the consolidated message
    const consolidatedMessage = await ctx.db.get(consolidatedMessageId);
    if (!consolidatedMessage) return [];

    const conversation = await ctx.db.get(consolidatedMessage.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      return [];
    }

    // Fetch all assistant messages linked to this consolidated message
    return await ctx.db
      .query("messages")
      .withIndex("by_consolidated_message", (q) =>
        q.eq("consolidatedMessageId", consolidatedMessageId),
      )
      .filter((q) => q.eq(q.field("role"), "assistant"))
      .collect();
  },
});

// Get the last assistant message in a conversation (for focus restoration)
export const getLastAssistantMessage = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    // Security: Verify user owns the conversation
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== user._id) {
      return null;
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .filter((q) => q.eq(q.field("role"), "assistant"))
      .order("desc")
      .first();
  },
});

// Memory extraction queries
export const listUnextracted = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    afterMessageId: v.optional(v.id("messages")),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("memoryExtracted"), false),
          q.eq(q.field("memoryExtracted"), undefined),
        ),
      );

    // If cursor provided, only get messages after it
    if (args.afterMessageId) {
      const cursorMsg = await ctx.db.get(args.afterMessageId);
      if (cursorMsg) {
        query = query.filter((q) =>
          q.gt(q.field("_creationTime"), cursorMsg._creationTime),
        );
      }
    }

    return await query.take(args.limit);
  },
});

export const listExtracted = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    beforeMessageId: v.id("messages"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const beforeMsg = await ctx.db.get(args.beforeMessageId);
    if (!beforeMsg) return [];

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("memoryExtracted"), true),
          q.lt(q.field("_creationTime"), beforeMsg._creationTime),
        ),
      )
      .order("desc")
      .take(args.limit);
  },
});

export const markExtracted = internalMutation({
  args: {
    messageIds: v.array(v.id("messages")),
    extractedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.messageIds.map((id) =>
        ctx.db.patch(id, {
          memoryExtracted: true,
          memoryExtractedAt: args.extractedAt,
        }),
      ),
    );
  },
});

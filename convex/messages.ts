import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, query } from "./_generated/server";

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
        v.literal("error"),
      ),
    ),
    model: v.optional(v.string()),
    comparisonGroupId: v.optional(v.string()), // NEW: For comparison mode
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
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: args.userId,
      role: args.role,
      content: args.content || "",
      status: args.status || "complete",
      model: args.model,
      comparisonGroupId: args.comparisonGroupId,
      attachments: args.attachments,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

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
      await ctx.scheduler.runAfter(
        0,
        // @ts-ignore
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

/**
 * Update source metadata after OpenGraph enrichment
 */
export const updateSourceMetadata = internalMutation({
  args: {
    messageId: v.id("messages"),
    metadata: v.array(
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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      sourceMetadata: args.metadata,
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
    toolCalls: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          arguments: v.string(),
          result: v.optional(v.string()),
          timestamp: v.number(),
          textPosition: v.optional(v.number()),
        }),
      ),
    ),
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
      toolCalls: args.toolCalls,
      partialToolCalls: undefined, // Clear loading state
      sources: args.sources,
      partialSources: undefined, // Clear streaming sources
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
      partialToolCalls: args.partialToolCalls,
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
    await ctx.db.patch(args.messageId, {
      status: "error",
      error: args.error,
      partialToolCalls: undefined, // Clear loading state
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

    const attachments = message.attachments || [];
    attachments.push(args.attachment);

    await ctx.db.patch(args.messageId, {
      attachments,
      updatedAt: Date.now(),
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

    const existingCalls = message.toolCalls || [];
    await ctx.db.patch(args.messageId, {
      toolCalls: [...existingCalls, ...args.toolCalls],
      updatedAt: Date.now(),
    });
  },
});

// Get all messages in a comparison group
export const getComparisonGroup = query({
  args: { comparisonGroupId: v.string() },
  handler: async (ctx, { comparisonGroupId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("messages")
      .withIndex("by_comparison_group", (q) =>
        q.eq("comparisonGroupId", comparisonGroupId),
      )
      .collect();
  },
});

// Get original assistant responses linked to a consolidated message
export const getOriginalResponses = query({
  args: { consolidatedMessageId: v.id("messages") },
  handler: async (ctx, { consolidatedMessageId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

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

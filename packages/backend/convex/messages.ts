import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { getCurrentUser } from "./lib/userSync";

export * as attachments from "./messages/attachments";
// ===== Re-exports from submodules =====
export * as embeddings from "./messages/embeddings";
export * as thinking from "./messages/thinking";
export * as toolCalls from "./messages/toolCalls";

// ===== Core CRUD =====

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
    comparisonGroupId: v.optional(v.string()),
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

    // Update user stats for progressive hints
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

// ===== List Queries =====

export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];

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

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();
  },
});

export const listWithUsers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];

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

    return await Promise.all(
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
  },
});

export const listPaginated = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return { page: [], isDone: true, continueCursor: "" };
    }

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
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .paginate({
        ...args.paginationOpts,
        cursor: args.paginationOpts.cursor ?? null,
      });
  },
});

export const listInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();
  },
});

// ===== Status Updates =====

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

export const markError = internalMutation({
  args: {
    messageId: v.id("messages"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
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

// ===== Message Completion =====

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
    providerMetadata: v.optional(v.any()),
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
      providerMetadata: args.providerMetadata,
      generationCompletedAt: Date.now(),
      updatedAt: Date.now(),
    });

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
          feature: "chat",
        },
      );

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

// ===== Comparison/Consolidation Queries =====

export const getComparisonGroup = query({
  args: { comparisonGroupId: v.string() },
  handler: async (ctx, { comparisonGroupId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_comparison_group", (q) =>
        q.eq("comparisonGroupId", comparisonGroupId),
      )
      .collect();

    if (messages.length > 0) {
      const conversation = await ctx.db.get(messages[0].conversationId);
      if (!conversation || conversation.userId !== user._id) {
        return [];
      }
    }

    return messages;
  },
});

export const getOriginalResponses = query({
  args: { consolidatedMessageId: v.id("messages") },
  handler: async (ctx, { consolidatedMessageId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const consolidatedMessage = await ctx.db.get(consolidatedMessageId);
    if (!consolidatedMessage) return [];

    const conversation = await ctx.db.get(consolidatedMessage.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      return [];
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_consolidated_message", (q) =>
        q.eq("consolidatedMessageId", consolidatedMessageId),
      )
      .filter((q) => q.eq(q.field("role"), "assistant"))
      .collect();
  },
});

export const getLastAssistantMessage = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
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

// ===== Memory Extraction Queries =====

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

// ===== Batch Queries for Local Cache =====

/**
 * Batch get metadata (attachments, toolCalls, sources) for multiple messages.
 * Used by local cache sync to reduce per-message queries.
 */
export const batchGetMetadata = query({
  args: {
    messageIds: v.array(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { attachments: [], toolCalls: [], sources: [] };

    // Batch fetch all metadata in parallel
    const [attachments, toolCalls, sources] = await Promise.all([
      Promise.all(
        args.messageIds.map((id) =>
          ctx.db
            .query("attachments")
            .withIndex("by_message", (q) => q.eq("messageId", id))
            .collect(),
        ),
      ),
      Promise.all(
        args.messageIds.map((id) =>
          ctx.db
            .query("toolCalls")
            .withIndex("by_message", (q) => q.eq("messageId", id))
            .collect(),
        ),
      ),
      Promise.all(
        args.messageIds.map((id) =>
          ctx.db
            .query("sources")
            .withIndex("by_message", (q) => q.eq("messageId", id))
            .collect(),
        ),
      ),
    ]);

    return {
      attachments: attachments.flat(),
      toolCalls: toolCalls.flat(),
      sources: sources.flat(),
    };
  },
});

// ===== Backward Compatibility Re-exports =====

// From attachments.ts
export { addAttachment, getAttachments } from "./messages/attachments";
// From thinking.ts
export {
  completeThinking,
  markThinkingStarted,
  updatePartialReasoning,
} from "./messages/thinking";
// From toolCalls.ts
export {
  addToolCalls,
  finalizeToolCalls,
  getToolCalls,
  updatePartialToolCalls,
  upsertToolCall,
} from "./messages/toolCalls";

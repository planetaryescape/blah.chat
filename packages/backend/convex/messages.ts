import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { getCurrentUser } from "./lib/userSync";

export * as attachments from "./messages/attachments";
// ===== Re-exports from submodules =====
export * as embeddings from "./messages/embeddings";
export * as recovery from "./messages/recovery";
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
    parentMessageId: v.optional(v.id("messages")), // Legacy
    branchIndex: v.optional(v.number()), // Legacy
    branchLabel: v.optional(v.string()), // Legacy
    // Tree architecture (P7)
    parentMessageIds: v.optional(v.array(v.id("messages"))),
    siblingIndex: v.optional(v.number()),
    isActiveBranch: v.optional(v.boolean()),
    rootMessageId: v.optional(v.id("messages")),
    forkReason: v.optional(
      v.union(
        v.literal("edit"),
        v.literal("regenerate"),
        v.literal("branch"),
        v.literal("model_compare"),
        v.literal("merge"),
      ),
    ),
    forkMetadata: v.optional(
      v.object({
        originalContent: v.optional(v.string()),
        originalBranchId: v.optional(v.string()),
        mergedFromIds: v.optional(v.array(v.id("messages"))),
        branchedAt: v.optional(v.number()),
        branchedBy: v.optional(v.id("users")),
      }),
    ),
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
    routingDecision: v.optional(
      v.object({
        selectedModelId: v.string(),
        classification: v.object({
          primaryCategory: v.string(),
          secondaryCategory: v.optional(v.string()),
          complexity: v.string(),
          requiresVision: v.boolean(),
          requiresLongContext: v.boolean(),
          requiresReasoning: v.boolean(),
          confidence: v.number(),
          isHighStakes: v.boolean(),
          highStakesDomain: v.optional(v.string()),
        }),
        reasoning: v.string(),
      }),
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
      // Legacy branching
      parentMessageId: args.parentMessageId,
      branchIndex: args.branchIndex,
      branchLabel: args.branchLabel,
      // Tree architecture (P7)
      parentMessageIds: args.parentMessageIds,
      siblingIndex: args.siblingIndex ?? 0,
      isActiveBranch: args.isActiveBranch ?? true,
      rootMessageId: args.rootMessageId,
      forkReason: args.forkReason,
      forkMetadata: args.forkMetadata,
      routingDecision: args.routingDecision,
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

    // Increment conversation messageCount and update activeLeafMessageId
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation) {
      const patchData: Record<string, unknown> = {
        messageCount: (conversation.messageCount || 0) + 1,
      };

      // Update activeLeafMessageId if this message is on the active branch
      if (args.isActiveBranch !== false) {
        patchData.activeLeafMessageId = messageId;
      }

      await ctx.db.patch(args.conversationId, patchData);
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

/**
 * Update message with routing decision after auto router selects a model.
 * Called from generation.ts when a pre-created message needs routing info.
 */
export const updateRoutingDecision = internalMutation({
  args: {
    messageId: v.id("messages"),
    model: v.string(),
    routingDecision: v.object({
      selectedModelId: v.string(),
      classification: v.object({
        primaryCategory: v.string(),
        secondaryCategory: v.optional(v.string()),
        complexity: v.string(),
        requiresVision: v.boolean(),
        requiresLongContext: v.boolean(),
        requiresReasoning: v.boolean(),
        confidence: v.number(),
        isHighStakes: v.boolean(),
        highStakesDomain: v.optional(v.string()),
      }),
      reasoning: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      model: args.model,
      routingDecision: args.routingDecision,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Mark message as retrying with a different model.
 * Used by auto-router recovery when initial model fails.
 */
export const markRetrying = internalMutation({
  args: {
    messageId: v.id("messages"),
    failedModels: v.array(v.string()),
    retryCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "generating",
      failedModels: args.failedModels,
      retryCount: args.retryCount,
      error: undefined,
      updatedAt: Date.now(),
    });
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
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .paginate({
        ...args.paginationOpts,
        cursor: args.paginationOpts.cursor ?? null,
      });
  },
});

export const listInternal = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc") // Get most recent first
      .take(args.limit ?? 1000); // Default to 1000 if no limit

    // Return in chronological order (asc)
    return messages.reverse();
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

const TERMINAL_STATUSES = new Set(["complete", "stopped", "error"]);

export const updatePartialContent = internalMutation({
  args: {
    messageId: v.id("messages"),
    partialContent: v.string(),
  },
  returns: v.object({ updated: v.boolean(), reason: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return { updated: false, reason: "not_found" };

    if (TERMINAL_STATUSES.has(message.status)) {
      return { updated: false, reason: `terminal:${message.status}` };
    }

    await ctx.db.patch(args.messageId, {
      partialContent: args.partialContent,
      status: "generating",
      updatedAt: Date.now(),
    });
    return { updated: true };
  },
});

export const updateMetrics = internalMutation({
  args: {
    messageId: v.id("messages"),
    apiCallStartedAt: v.optional(v.number()),
    firstTokenAt: v.optional(v.number()),
    tokensPerSecond: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      apiCallStartedAt: args.apiCallStartedAt,
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

    // Respect terminal states - update metrics but don't change status
    if (message.status === "stopped" || message.status === "error") {
      await ctx.db.patch(args.messageId, {
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        reasoningTokens: args.reasoningTokens,
        cost: args.cost,
        tokensPerSecond: args.tokensPerSecond,
        providerMetadata: args.providerMetadata,
        generationCompletedAt: Date.now(),
        updatedAt: Date.now(),
      });
      return;
    }

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
// ===== P7 Tree Architecture Queries =====

/**
 * Get all branches (children) at a specific message
 * Used for branch navigation UI
 */
export const getBranchesAtMessage = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return [];

    // Get children using legacy index (works for both old and new structure)
    const legacyChildren = await ctx.db
      .query("messages")
      .withIndex("by_parent", (q) => q.eq("parentMessageId", args.messageId))
      .collect();

    // For new parentMessageIds, we need to filter all messages in conversation
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", message.conversationId),
      )
      .collect();

    const arrayChildren = allMessages.filter(
      (m) =>
        m.parentMessageIds?.includes(args.messageId) &&
        m.parentMessageId !== args.messageId,
    );

    // Combine and dedupe
    const childMap = new Map();
    for (const child of [...legacyChildren, ...arrayChildren]) {
      childMap.set(child._id, child);
    }

    return Array.from(childMap.values()).sort(
      (a, b) => (a.siblingIndex ?? 0) - (b.siblingIndex ?? 0),
    );
  },
});

/**
 * Get branch statistics for a conversation
 * Used for UI badges and branch navigation overview
 */
export const getBranchInfo = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return {
        totalMessages: 0,
        branchCount: 0,
        branchPoints: [],
        activePathLength: 0,
      };
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    // Find branch points (messages with multiple children)
    const branchPoints: Array<{
      messageId: string;
      childCount: number;
      createdAt: number;
    }> = [];

    for (const msg of messages) {
      // Count children
      const children = messages.filter(
        (m) =>
          m.parentMessageId === msg._id ||
          m.parentMessageIds?.includes(msg._id),
      );

      if (children.length > 1) {
        branchPoints.push({
          messageId: msg._id,
          childCount: children.length,
          createdAt: msg.createdAt,
        });
      }
    }

    // Count active path length
    const activePathLength = messages.filter((m) => m.isActiveBranch).length;

    return {
      totalMessages: messages.length,
      branchCount: conversation.branchCount ?? 1,
      branchPoints: branchPoints.sort((a, b) => a.createdAt - b.createdAt),
      activePathLength:
        activePathLength > 0 ? activePathLength : messages.length,
    };
  },
});

/**
 * Get message ancestors (context) up to N levels
 * Used for providing context in generation
 */
export const getMessageContext = internalQuery({
  args: {
    messageId: v.id("messages"),
    depth: v.optional(v.number()), // Max ancestors to return, default all
  },
  handler: async (ctx, args) => {
    const maxDepth = args.depth ?? Infinity;
    const ancestors: Doc<"messages">[] = [];

    let currentId: Id<"messages"> | undefined = args.messageId;
    const visited = new Set<string>();
    let depth = 0;

    while (currentId && depth < maxDepth) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const message: Doc<"messages"> | null = await ctx.db.get(currentId);
      if (!message) break;

      ancestors.push(message);

      // Get parent (prefer array, fallback to legacy)
      currentId = message.parentMessageIds?.[0] ?? message.parentMessageId;
      depth++;
    }

    return ancestors.reverse(); // Root first
  },
});

/**
 * Get sibling messages (same parent)
 * Used for branch switching UI
 */
export const getSiblings = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return [];

    // Get parent ID
    const parentId = message.parentMessageIds?.[0] ?? message.parentMessageId;
    if (!parentId) {
      // Root message - only sibling is itself
      return [message];
    }

    // Get all children of parent
    const legacyChildren = await ctx.db
      .query("messages")
      .withIndex("by_parent", (q) => q.eq("parentMessageId", parentId))
      .collect();

    // Also check for new-style children
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", message.conversationId),
      )
      .collect();

    const arrayChildren = allMessages.filter(
      (m) =>
        m.parentMessageIds?.includes(parentId) &&
        m.parentMessageId !== parentId,
    );

    // Combine and dedupe
    const siblingMap = new Map();
    for (const sibling of [...legacyChildren, ...arrayChildren]) {
      siblingMap.set(sibling._id, sibling);
    }

    return Array.from(siblingMap.values()).sort(
      (a, b) => (a.siblingIndex ?? 0) - (b.siblingIndex ?? 0),
    );
  },
});

// From toolCalls.ts
export {
  addToolCalls,
  cleanupPartialToolCalls,
  finalizeToolCalls,
  getToolCallCountByConversation,
  getToolCalls,
  upsertToolCall,
} from "./messages/toolCalls";

import { v } from "convex/values";
import { nanoid } from "nanoid";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

export const create = action({
  args: {
    conversationId: v.id("conversations"),
    password: v.optional(v.string()),
    expiresIn: v.optional(v.number()), // days
    anonymizeUsernames: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get user via Clerk identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get user from DB
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getUserInternal,
      { clerkId: identity.subject },
    )) as Doc<"users"> | null;
    if (!user) throw new Error("User not found");

    // Verify conversation ownership
    const conversation = await ctx.runQuery(
      internal.shares.getConversationInternal,
      {
        conversationId: args.conversationId,
      },
    );
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found or unauthorized");
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (args.password) {
      hashedPassword = await ctx.runMutation(
        internal.shares.password.hashPassword,
        {
          password: args.password,
        },
      );
    }

    // Calculate expiry timestamp
    let expiresAt: number | undefined;
    if (args.expiresIn) {
      expiresAt = Date.now() + args.expiresIn * 24 * 60 * 60 * 1000;
    }

    const shareId = nanoid(10);

    await ctx.runMutation(internal.shares.createInternal, {
      conversationId: args.conversationId,
      userId: user._id,
      shareId,
      title: conversation.title,
      password: hashedPassword,
      expiresAt,
      anonymizeUsernames: args.anonymizeUsernames || false,
    });

    return shareId;
  },
});

export const createInternal = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    shareId: v.string(),
    title: v.string(),
    password: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    anonymizeUsernames: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("shares", {
      conversationId: args.conversationId,
      userId: args.userId,
      shareId: args.shareId,
      title: args.title,
      password: args.password,
      expiresAt: args.expiresAt,
      anonymizeUsernames: args.anonymizeUsernames,
      isPublic: true,
      isActive: true,
      viewCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("shares")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!share) return null;

    // Check if revoked
    if (!share.isActive) {
      return { revoked: true };
    }

    // Check expiry
    if (share.expiresAt && share.expiresAt < Date.now()) {
      return null;
    }

    return {
      _id: share._id,
      conversationId: share.conversationId,
      userId: share.userId,
      requiresPassword: !!share.password,
      anonymizeUsernames: share.anonymizeUsernames,
      expiresAt: share.expiresAt,
      isActive: share.isActive,
    };
  },
});

/**
 * Get shared conversation (public - no auth required)
 * Only returns data if share is valid and active
 */
export const getSharedConversation = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("shares")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!share || !share.isActive) return null;
    if (share.expiresAt && share.expiresAt < Date.now()) return null;

    const conversation = await ctx.db.get(share.conversationId);
    return conversation;
  },
});

/**
 * Get shared messages (public - no auth required)
 * Only returns data if share is valid and active
 */
export const getSharedMessages = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("shares")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!share || !share.isActive) return null;
    if (share.expiresAt && share.expiresAt < Date.now()) return null;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", share.conversationId),
      )
      .collect();

    return messages;
  },
});

export const verify = action({
  args: {
    shareId: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const share = await ctx.runQuery(internal.shares.getByShareId, {
      shareId: args.shareId,
    });

    if (!share) throw new Error("Share not found");

    // Check if revoked
    if (!share.isActive) {
      throw new Error("This share has been revoked by the owner");
    }

    // Check expiry
    if (share.expiresAt && share.expiresAt < Date.now()) {
      throw new Error("Share has expired");
    }

    // Verify password if required
    if (share.password) {
      if (!args.password) {
        throw new Error("Password required");
      }
      const valid = await ctx.runMutation(
        internal.shares.password.verifyPassword,
        {
          password: args.password,
          hash: share.password,
        },
      );
      if (!valid) {
        throw new Error("Invalid password");
      }
    }

    // Increment view count
    await ctx.runMutation(internal.shares.incrementViewCount, {
      shareId: share._id,
    });

    return true;
  },
});

export const getByShareId = internalQuery({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shares")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();
  },
});

export const incrementViewCount = internalMutation({
  args: { shareId: v.id("shares") },
  handler: async (ctx, args) => {
    const share = await ctx.db.get(args.shareId);
    if (!share) return;

    await ctx.db.patch(args.shareId, {
      viewCount: share.viewCount + 1,
    });
  },
});

export const toggle = mutation({
  args: {
    conversationId: v.id("conversations"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Find share for this conversation
    const share = await ctx.db
      .query("shares")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();

    if (!share) {
      throw new Error("No share exists for this conversation");
    }

    if (share.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(share._id, {
      isActive: args.isActive,
    });

    return share.shareId;
  },
});

export const getByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const share = await ctx.db
      .query("shares")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();

    if (!share || share.userId !== user._id) {
      return null;
    }

    return share;
  },
});

export const list = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const shares = await ctx.db
      .query("shares")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return shares;
  },
});

export const remove = mutation({
  args: { shareId: v.id("shares") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const share = await ctx.db.get(args.shareId);

    if (!share || share.userId !== user._id) {
      throw new Error("Share not found or unauthorized");
    }

    await ctx.db.delete(args.shareId);
  },
});

// Internal helper queries for actions
export const getUserInternal = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const getConversationInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

export const getMessagesInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
  },
});

export const getAttachmentsByMessageInternal = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attachments")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
  },
});

export const getToolCallsByMessageInternal = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("toolCalls")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
  },
});

export const getSourcesByMessageInternal = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sources")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
  },
});

// ============================================================================
// BATCH FETCH HELPERS - Performance Optimization for Fork Operations
// ============================================================================
// Problem: Querying attachments/toolCalls/sources per message = 3N queries
// Solution: Fetch all conversation data upfront, group by messageId with Map
// Impact: 100 messages: 300 queries → 3 queries (100x faster)
//         1000 messages: 3000 queries → 3 queries (1000x faster)
// Pattern: Batch fetch + Map grouping + O(1) lookups = standard N+1 fix
// ============================================================================

export const getAttachmentsByConversationInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attachments")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
  },
});

export const getToolCallsByConversationInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("toolCalls")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
  },
});

export const getSourcesByConversationInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sources")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
  },
});

/**
 * Fork a shared conversation privately
 * Creates a new conversation owned by the current user with all messages copied
 */
export const forkPrivate = action({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get current user
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getUserInternal,
      { clerkId: identity.subject },
    )) as Doc<"users"> | null;
    if (!user) throw new Error("User not found");

    // Get share + validate
    const share = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getByShareId,
      { shareId: args.shareId },
    )) as Doc<"shares"> | null;
    if (!share || !share.isActive) throw new Error("Share not found");
    if (share.expiresAt && share.expiresAt < Date.now())
      throw new Error("Expired");

    // Get original conversation
    const original = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"conversations"> | null;
    if (!original) throw new Error("Conversation not found");

    // Get messages
    const messages = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getMessagesInternal,
      { conversationId: share.conversationId },
    )) as Doc<"messages">[];

    // Create new private conversation via internal mutation
    const newId = (await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.createForkedConversation,
      {
        userId: user._id,
        title: `${original.title} (continued)`,
        model: original.model,
        systemPrompt: original.systemPrompt,
        isCollaborative: false,
        messageCount: messages.length,
      },
    )) as string;

    // PERFORMANCE OPTIMIZATION: Batch fetch all related data (3 queries instead of 3N)
    // Why: Prevents N+1 query problem that would cause 300+ queries for 100-message conversations
    // Old approach: Query attachments/toolCalls/sources inside the message loop (3 queries × N messages)
    // New approach: Fetch all data upfront (3 queries total), group with Map, O(1) lookups in loop
    const allAttachments = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getAttachmentsByConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"attachments">[];

    const allToolCalls = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getToolCallsByConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"toolCalls">[];

    const allSources = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getSourcesByConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"sources">[];

    // Group by messageId for O(1) lookups (standard Map grouping pattern)
    // Creates Map<messageId, attachments[]> for fast access during message copy loop
    const attachmentsByMessage = new Map<string, Doc<"attachments">[]>();
    for (const att of allAttachments) {
      const key = att.messageId;
      if (!attachmentsByMessage.has(key)) attachmentsByMessage.set(key, []);
      attachmentsByMessage.get(key)!.push(att);
    }

    const toolCallsByMessage = new Map<string, Doc<"toolCalls">[]>();
    for (const tc of allToolCalls) {
      const key = tc.messageId;
      if (!toolCallsByMessage.has(key)) toolCallsByMessage.set(key, []);
      toolCallsByMessage.get(key)!.push(tc);
    }

    const sourcesByMessage = new Map<string, Doc<"sources">[]>();
    for (const src of allSources) {
      const key = src.messageId;
      if (!sourcesByMessage.has(key)) sourcesByMessage.set(key, []);
      sourcesByMessage.get(key)!.push(src);
    }

    // Copy messages + attachments + toolCalls + sources
    for (const msg of messages) {
      const newMsgId = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.shares.copyMessage,
        {
          conversationId: newId,
          userId: user._id, // All messages belong to new owner
          originalMessage: msg,
        },
      )) as string;

      // Copy attachments (Map lookup instead of query)
      const attachments = attachmentsByMessage.get(msg._id) || [];
      for (const att of attachments) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.shares.copyAttachment,
          {
            messageId: newMsgId,
            conversationId: newId,
            userId: user._id,
            original: att,
          },
        );
      }

      // Copy tool calls (Map lookup instead of query)
      const toolCalls = toolCallsByMessage.get(msg._id) || [];
      for (const tc of toolCalls) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.shares.copyToolCall,
          {
            messageId: newMsgId,
            conversationId: newId,
            userId: user._id,
            original: tc,
          },
        );
      }

      // Copy sources (Map lookup instead of query)
      const sources = sourcesByMessage.get(msg._id) || [];
      for (const src of sources) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.shares.copySource,
          {
            messageId: newMsgId,
            conversationId: newId,
            userId: user._id,
            original: src,
          },
        );
      }
    }

    return newId;
  },
});

/**
 * Fork a shared conversation collaboratively
 * Creates a new conversation with both users as participants
 */
export const forkCollaborative = action({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get current user
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getUserInternal,
      { clerkId: identity.subject },
    )) as Doc<"users"> | null;
    if (!user) throw new Error("User not found");

    // Get share + validate
    const share = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getByShareId,
      { shareId: args.shareId },
    )) as Doc<"shares"> | null;
    if (!share || !share.isActive) throw new Error("Share not found");
    if (share.expiresAt && share.expiresAt < Date.now())
      throw new Error("Expired");

    // Get original conversation
    const original = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"conversations"> | null;
    if (!original) throw new Error("Conversation not found");

    // Prevent self-collaboration
    if (original.userId === user._id) {
      throw new Error("Cannot collaborate with yourself");
    }

    // Get original owner
    const originalOwner = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getUserByIdInternal,
      { userId: original.userId },
    )) as Doc<"users"> | null;

    // Get messages
    const messages = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getMessagesInternal,
      { conversationId: share.conversationId },
    )) as Doc<"messages">[];

    // Create collaborative conversation (owner stays original)
    const collabId = (await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.createForkedConversation,
      {
        userId: original.userId, // Original owner remains primary
        title: `${original.title} (shared)`,
        model: original.model,
        systemPrompt: original.systemPrompt,
        isCollaborative: true,
        messageCount: messages.length,
      },
    )) as string;

    // Add both users as participants
    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.addParticipant,
      {
        conversationId: collabId,
        userId: original.userId,
        role: "owner",
      },
    );

    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.addParticipant,
      {
        conversationId: collabId,
        userId: user._id,
        role: "collaborator",
        invitedBy: original.userId,
        sourceShareId: args.shareId,
      },
    );

    // PERFORMANCE OPTIMIZATION: Batch fetch all related data (3 queries instead of 3N)
    // Why: Prevents N+1 query problem that would cause 300+ queries for 100-message conversations
    // Old approach: Query attachments/toolCalls/sources inside the message loop (3 queries × N messages)
    // New approach: Fetch all data upfront (3 queries total), group with Map, O(1) lookups in loop
    const allAttachments = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getAttachmentsByConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"attachments">[];

    const allToolCalls = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getToolCallsByConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"toolCalls">[];

    const allSources = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.getSourcesByConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"sources">[];

    // Group by messageId for O(1) lookups (standard Map grouping pattern)
    // Creates Map<messageId, attachments[]> for fast access during message copy loop
    const attachmentsByMessage = new Map<string, Doc<"attachments">[]>();
    for (const att of allAttachments) {
      const key = att.messageId;
      if (!attachmentsByMessage.has(key)) attachmentsByMessage.set(key, []);
      attachmentsByMessage.get(key)!.push(att);
    }

    const toolCallsByMessage = new Map<string, Doc<"toolCalls">[]>();
    for (const tc of allToolCalls) {
      const key = tc.messageId;
      if (!toolCallsByMessage.has(key)) toolCallsByMessage.set(key, []);
      toolCallsByMessage.get(key)!.push(tc);
    }

    const sourcesByMessage = new Map<string, Doc<"sources">[]>();
    for (const src of allSources) {
      const key = src.messageId;
      if (!sourcesByMessage.has(key)) sourcesByMessage.set(key, []);
      sourcesByMessage.get(key)!.push(src);
    }

    // Copy messages + attachments + toolCalls + sources (preserve original userIds)
    for (const msg of messages) {
      const newMsgId = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.shares.copyMessage,
        {
          conversationId: collabId,
          userId: msg.userId, // Keep original author for attribution
          originalMessage: msg,
        },
      )) as string;

      // Copy attachments (Map lookup instead of query)
      const attachments = attachmentsByMessage.get(msg._id) || [];
      for (const att of attachments) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.shares.copyAttachment,
          {
            messageId: newMsgId,
            conversationId: collabId,
            userId: att.userId, // Preserve original owner
            original: att,
          },
        );
      }

      // Copy tool calls (Map lookup instead of query)
      const toolCalls = toolCallsByMessage.get(msg._id) || [];
      for (const tc of toolCalls) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.shares.copyToolCall,
          {
            messageId: newMsgId,
            conversationId: collabId,
            userId: tc.userId, // Preserve original owner
            original: tc,
          },
        );
      }

      // Copy sources (Map lookup instead of query)
      const sources = sourcesByMessage.get(msg._id) || [];
      for (const src of sources) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.shares.copySource,
          {
            messageId: newMsgId,
            conversationId: collabId,
            userId: src.userId, // Preserve original owner
            original: src,
          },
        );
      }
    }

    // Create notification for original owner
    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.createJoinNotification,
      {
        ownerId: original.userId,
        conversationId: collabId,
        conversationTitle: original.title,
        joinedUserId: user._id,
        joinedUserName: user.name,
      },
    );

    return collabId;
  },
});

// Internal helpers for fork operations

export const getUserByIdInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const createForkedConversation = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    model: v.string(),
    systemPrompt: v.optional(v.string()),
    isCollaborative: v.boolean(),
    messageCount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("conversations", {
      userId: args.userId,
      title: args.title,
      model: args.model,
      systemPrompt: args.systemPrompt,
      isCollaborative: args.isCollaborative,
      pinned: false,
      archived: false,
      starred: false,
      messageCount: args.messageCount,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const copyMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.optional(v.id("users")),
    originalMessage: v.any(),
  },
  handler: async (ctx, args) => {
    const msg = args.originalMessage;
    const now = Date.now();

    // Copy all message fields, excluding IDs and streaming partial content
    // Note: partialContent/partialReasoning/partialSources are streaming-only, not needed
    // Note: embedding not copied - would need re-generation for new context
    // Note: comparison/branching fields reset - forked conv has no branches yet
    const id = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: args.userId,
      role: msg.role,
      content: msg.content,
      // status: use original status (might be "error" with error message)
      status:
        msg.status === "generating" || msg.status === "pending"
          ? "complete"
          : msg.status,
      model: msg.model,
      inputTokens: msg.inputTokens,
      outputTokens: msg.outputTokens,
      cost: msg.cost,
      // Reasoning/thinking
      reasoning: msg.reasoning,
      reasoningTokens: msg.reasoningTokens,
      thinkingStartedAt: msg.thinkingStartedAt,
      thinkingCompletedAt: msg.thinkingCompletedAt,
      // Error state
      error: msg.error,
      // Provider metadata
      providerMetadata: msg.providerMetadata,
      // Generation timing
      generationStartedAt: msg.generationStartedAt,
      generationCompletedAt: msg.generationCompletedAt,
      // Performance metrics
      firstTokenAt: msg.firstTokenAt,
      tokensPerSecond: msg.tokensPerSecond,
      // Memory extraction (reset - new conv hasn't extracted yet)
      memoryExtracted: false,
      // DEPRECATED source fields (copy for backward compat)
      sources: msg.sources,
      sourceMetadata: msg.sourceMetadata,
      // Timestamps
      createdAt: msg.createdAt ?? now,
      updatedAt: now,
    });
    return id;
  },
});

export const copyAttachment = internalMutation({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    original: v.any(),
  },
  handler: async (ctx, args) => {
    const att = args.original;
    await ctx.db.insert("attachments", {
      messageId: args.messageId,
      conversationId: args.conversationId,
      userId: args.userId,
      storageId: att.storageId,
      name: att.name,
      type: att.type,
      mimeType: att.mimeType,
      size: att.size,
      metadata: att.metadata,
      createdAt: Date.now(),
    });
  },
});

export const copyToolCall = internalMutation({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    original: v.any(),
  },
  handler: async (ctx, args) => {
    const tc = args.original;
    await ctx.db.insert("toolCalls", {
      messageId: args.messageId,
      conversationId: args.conversationId,
      userId: args.userId,
      toolCallId: tc.toolCallId,
      toolName: tc.toolName,
      args: tc.args,
      result: tc.result,
      textPosition: tc.textPosition,
      isPartial: false, // Completed tool calls only
      timestamp: tc.timestamp,
      createdAt: Date.now(),
    });
  },
});

export const copySource = internalMutation({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    original: v.any(),
  },
  handler: async (ctx, args) => {
    const src = args.original;
    await ctx.db.insert("sources", {
      messageId: args.messageId,
      conversationId: args.conversationId,
      userId: args.userId,
      position: src.position,
      provider: src.provider,
      title: src.title,
      snippet: src.snippet,
      urlHash: src.urlHash,
      url: src.url,
      isPartial: false, // Completed sources only
      createdAt: Date.now(),
    });
  },
});

export const addParticipant = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("collaborator")),
    invitedBy: v.optional(v.id("users")),
    sourceShareId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("conversationParticipants", {
      conversationId: args.conversationId,
      userId: args.userId,
      role: args.role,
      joinedAt: Date.now(),
      invitedBy: args.invitedBy,
      sourceShareId: args.sourceShareId,
    });
  },
});

export const createJoinNotification = internalMutation({
  args: {
    ownerId: v.id("users"),
    conversationId: v.id("conversations"),
    conversationTitle: v.string(),
    joinedUserId: v.id("users"),
    joinedUserName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.ownerId,
      type: "collaboration_joined",
      title: "New collaborator",
      message: `${args.joinedUserName || "Someone"} joined "${args.conversationTitle}"`,
      data: {
        conversationId: args.conversationId,
        joinedUserId: args.joinedUserId,
        joinedUserName: args.joinedUserName,
      },
      read: false,
      createdAt: Date.now(),
    });
  },
});

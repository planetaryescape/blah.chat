import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action, internalMutation } from "../_generated/server";

// ===== Fork Actions =====

export const forkPrivate = action({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get current user
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.internal.getUserInternal,
      { clerkId: identity.subject },
    )) as Doc<"users"> | null;
    if (!user) throw new Error("User not found");

    // Get share + validate
    const share = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.internal.getByShareId,
      { shareId: args.shareId },
    )) as Doc<"shares"> | null;
    if (!share || !share.isActive) throw new Error("Share not found");
    if (share.expiresAt && share.expiresAt < Date.now())
      throw new Error("Expired");

    // Get original conversation
    const original = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.internal.getConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"conversations"> | null;
    if (!original) throw new Error("Conversation not found");

    // Get messages
    const messages = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.internal.getMessagesInternal,
      { conversationId: share.conversationId },
    )) as Doc<"messages">[];

    // Create new private conversation
    const newId = (await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.fork.createForkedConversation,
      {
        userId: user._id,
        title: `${original.title} (continued)`,
        model: original.model,
        systemPrompt: original.systemPrompt,
        isCollaborative: false,
        messageCount: messages.length,
      },
    )) as string;

    // Batch fetch all related data (3 queries instead of 3N)
    const allAttachments = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.internal.getAttachmentsByConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"attachments">[];

    const allToolCalls = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.internal.getToolCallsByConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"toolCalls">[];

    const allSources = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.internal.getSourcesByConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"sources">[];

    // Group by messageId for O(1) lookups
    const attachmentsByMessage = new Map<string, Doc<"attachments">[]>();
    for (const att of allAttachments) {
      const key = att.messageId;
      if (!attachmentsByMessage.has(key)) attachmentsByMessage.set(key, []);
      attachmentsByMessage.get(key)?.push(att);
    }

    const toolCallsByMessage = new Map<string, Doc<"toolCalls">[]>();
    for (const tc of allToolCalls) {
      const key = tc.messageId;
      if (!toolCallsByMessage.has(key)) toolCallsByMessage.set(key, []);
      toolCallsByMessage.get(key)?.push(tc);
    }

    const sourcesByMessage = new Map<string, Doc<"sources">[]>();
    for (const src of allSources) {
      const key = src.messageId;
      if (!sourcesByMessage.has(key)) sourcesByMessage.set(key, []);
      sourcesByMessage.get(key)?.push(src);
    }

    // Copy messages + attachments + toolCalls + sources
    for (const msg of messages) {
      const newMsgId = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.shares.fork.copyMessage,
        {
          conversationId: newId,
          userId: user._id,
          originalMessage: msg,
        },
      )) as string;

      // Copy attachments
      const attachments = attachmentsByMessage.get(msg._id) || [];
      for (const att of attachments) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.shares.fork.copyAttachment,
          {
            messageId: newMsgId,
            conversationId: newId,
            userId: user._id,
            original: att,
          },
        );
      }

      // Copy tool calls
      const toolCalls = toolCallsByMessage.get(msg._id) || [];
      for (const tc of toolCalls) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.shares.fork.copyToolCall,
          {
            messageId: newMsgId,
            conversationId: newId,
            userId: user._id,
            original: tc,
          },
        );
      }

      // Copy sources
      const sources = sourcesByMessage.get(msg._id) || [];
      for (const src of sources) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.shares.fork.copySource,
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

export const forkCollaborative = action({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get current user
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.internal.getUserInternal,
      { clerkId: identity.subject },
    )) as Doc<"users"> | null;
    if (!user) throw new Error("User not found");

    // Get share + validate
    const share = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.internal.getByShareId,
      { shareId: args.shareId },
    )) as Doc<"shares"> | null;
    if (!share || !share.isActive) throw new Error("Share not found");
    if (share.expiresAt && share.expiresAt < Date.now())
      throw new Error("Expired");

    // Get original conversation
    const original = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.internal.getConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"conversations"> | null;
    if (!original) throw new Error("Conversation not found");

    // Prevent self-collaboration
    if (original.userId === user._id) {
      throw new Error("Cannot collaborate with yourself");
    }

    // Get messages
    const messages = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.internal.getMessagesInternal,
      { conversationId: share.conversationId },
    )) as Doc<"messages">[];

    // Create collaborative conversation
    const collabId = (await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.fork.createForkedConversation,
      {
        userId: original.userId,
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
      internal.shares.fork.addParticipant,
      {
        conversationId: collabId,
        userId: original.userId,
        role: "owner",
      },
    );

    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.fork.addParticipant,
      {
        conversationId: collabId,
        userId: user._id,
        role: "collaborator",
        invitedBy: original.userId,
        sourceShareId: args.shareId,
      },
    );

    // Batch fetch all related data
    const allAttachments = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.internal.getAttachmentsByConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"attachments">[];

    const allToolCalls = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.internal.getToolCallsByConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"toolCalls">[];

    const allSources = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.internal.getSourcesByConversationInternal,
      { conversationId: share.conversationId },
    )) as Doc<"sources">[];

    // Group by messageId
    const attachmentsByMessage = new Map<string, Doc<"attachments">[]>();
    for (const att of allAttachments) {
      const key = att.messageId;
      if (!attachmentsByMessage.has(key)) attachmentsByMessage.set(key, []);
      attachmentsByMessage.get(key)?.push(att);
    }

    const toolCallsByMessage = new Map<string, Doc<"toolCalls">[]>();
    for (const tc of allToolCalls) {
      const key = tc.messageId;
      if (!toolCallsByMessage.has(key)) toolCallsByMessage.set(key, []);
      toolCallsByMessage.get(key)?.push(tc);
    }

    const sourcesByMessage = new Map<string, Doc<"sources">[]>();
    for (const src of allSources) {
      const key = src.messageId;
      if (!sourcesByMessage.has(key)) sourcesByMessage.set(key, []);
      sourcesByMessage.get(key)?.push(src);
    }

    // Copy messages (preserve original userIds)
    for (const msg of messages) {
      const newMsgId = (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.shares.fork.copyMessage,
        {
          conversationId: collabId,
          userId: msg.userId,
          originalMessage: msg,
        },
      )) as string;

      // Copy attachments
      const attachments = attachmentsByMessage.get(msg._id) || [];
      for (const att of attachments) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.shares.fork.copyAttachment,
          {
            messageId: newMsgId,
            conversationId: collabId,
            userId: att.userId,
            original: att,
          },
        );
      }

      // Copy tool calls
      const toolCalls = toolCallsByMessage.get(msg._id) || [];
      for (const tc of toolCalls) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.shares.fork.copyToolCall,
          {
            messageId: newMsgId,
            conversationId: collabId,
            userId: tc.userId,
            original: tc,
          },
        );
      }

      // Copy sources
      const sources = sourcesByMessage.get(msg._id) || [];
      for (const src of sources) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.shares.fork.copySource,
          {
            messageId: newMsgId,
            conversationId: collabId,
            userId: src.userId,
            original: src,
          },
        );
      }
    }

    // Create notification for original owner
    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.shares.fork.createJoinNotification,
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

// ===== Fork Internal Helpers =====

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

    const id = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: args.userId,
      role: msg.role,
      content: msg.content,
      status:
        msg.status === "generating" || msg.status === "pending"
          ? "complete"
          : msg.status,
      model: msg.model,
      inputTokens: msg.inputTokens,
      outputTokens: msg.outputTokens,
      cost: msg.cost,
      reasoning: msg.reasoning,
      reasoningTokens: msg.reasoningTokens,
      thinkingStartedAt: msg.thinkingStartedAt,
      thinkingCompletedAt: msg.thinkingCompletedAt,
      error: msg.error,
      providerMetadata: msg.providerMetadata,
      generationStartedAt: msg.generationStartedAt,
      generationCompletedAt: msg.generationCompletedAt,
      firstTokenAt: msg.firstTokenAt,
      tokensPerSecond: msg.tokensPerSecond,
      memoryExtracted: false,
      sources: msg.sources,
      sourceMetadata: msg.sourceMetadata,
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
      isPartial: false,
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
      isPartial: false,
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

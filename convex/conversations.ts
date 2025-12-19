// @ts-nocheck
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";
import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Check if user can access a conversation
 * Returns true if user is owner OR participant (for collaborative)
 */
async function canAccessConversation(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
): Promise<boolean> {
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) return false;

  // Owner always has access
  if (conversation.userId === userId) return true;

  // Check participant table for collaborative conversations
  if (conversation.isCollaborative) {
    const participant = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", userId).eq("conversationId", conversationId),
      )
      .first();

    return participant !== null;
  }

  return false;
}

export const create = mutation({
  args: {
    model: v.string(),
    title: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    // Incognito mode support
    isIncognito: v.optional(v.boolean()),
    incognitoSettings: v.optional(
      v.object({
        enableReadTools: v.optional(v.boolean()),
        applyCustomInstructions: v.optional(v.boolean()),
        inactivityTimeoutMinutes: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      userId: user._id,
      title: args.title || (args.isIncognito ? "Incognito Chat" : "New Chat"),
      model: args.model,
      systemPrompt: args.systemPrompt,
      pinned: false,
      archived: false,
      starred: false,
      messageCount: 0,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
      // Incognito fields
      ...(args.isIncognito && {
        isIncognito: true,
        incognitoSettings: {
          enableReadTools: args.incognitoSettings?.enableReadTools ?? true,
          applyCustomInstructions:
            args.incognitoSettings?.applyCustomInstructions ?? true,
          inactivityTimeoutMinutes:
            args.incognitoSettings?.inactivityTimeoutMinutes,
          lastActivityAt: now,
        },
      }),
    });

    // Update user stats for progressive hints
    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (stats) {
      await ctx.db.patch(stats._id, {
        totalConversations: stats.totalConversations + 1,
        messagesInCurrentConvo: 0, // Reset for new conversation
        lastUpdated: Date.now(),
      });
    } else {
      // Auto-create stats if missing
      await ctx.db.insert("userStats", {
        userId: user._id,
        totalMessages: 0,
        totalConversations: 1,
        totalSearches: 0,
        totalBookmarks: 0,
        longMessageCount: 0,
        messagesInCurrentConvo: 0,
        consecutiveSearches: 0,
        promptPatternCount: {},
        lastUpdated: Date.now(),
      });
    }

    return conversationId;
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    // Check access: owner OR participant
    const hasAccess = await canAccessConversation(
      ctx,
      args.conversationId,
      user._id,
    );

    if (!hasAccess) return null;

    return conversation;
  },
});

/**
 * Get all participants for a conversation
 * Useful for showing who's in a collaborative conversation
 */
export const getParticipants = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Check access first
    const hasAccess = await canAccessConversation(
      ctx,
      args.conversationId,
      user._id,
    );
    if (!hasAccess) return [];

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.isCollaborative) return [];

    // Get participants
    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    // Fetch user details
    const participantsWithUsers = await Promise.all(
      participants.map(async (p) => {
        const participantUser = await ctx.db.get(p.userId);
        return {
          ...p,
          user: participantUser
            ? {
                _id: participantUser._id,
                name: participantUser.name,
                email: participantUser.email,
                imageUrl: participantUser.imageUrl,
              }
            : null,
        };
      }),
    );

    return participantsWithUsers;
  },
});

/**
 * Server-side query for REST API - verifies ownership via clerkId parameter
 * Use this when calling from server-side without JWT auth context
 */
export const getWithClerkVerification = query({
  args: {
    conversationId: v.id("conversations"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Look up user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return null;

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation || conversation.userId !== user._id) {
      return null;
    }

    return conversation;
  },
});

export const list = query({
  args: {
    searchQuery: v.optional(v.string()),
    limit: v.optional(v.number()),
    projectId: v.optional(v.union(v.id("projects"), v.literal("none"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // SEARCH MODE: Use search index if query provided
    if (args.searchQuery?.trim()) {
      const query = ctx.db
        .query("conversations")
        .withSearchIndex("search_title", (q) =>
          q
            // biome-ignore lint/style/noNonNullAssertion: searchQuery is validated as required
            .search("title", args.searchQuery!)
            .eq("userId", user._id)
            .eq("archived", false),
        );

      let results = args.limit
        ? await query.take(args.limit)
        : await query.collect();

      // Apply project filter
      if (args.projectId !== undefined) {
        if (args.projectId === "none") {
          results = results.filter((c) => !c.projectId);
        } else {
          results = results.filter((c) => c.projectId === args.projectId);
        }
      }

      return results.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return 0; // Maintain search relevance order
      });
    }

    // DEFAULT MODE: Get owned + collaborative conversations

    // 1. Get owned conversations
    let ownedQuery = ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("archived"), false));

    // Apply project filter to owned
    if (args.projectId !== undefined) {
      if (args.projectId === "none") {
        ownedQuery = ownedQuery.filter((q) =>
          q.eq(q.field("projectId"), undefined),
        );
      } else {
        ownedQuery = ownedQuery.filter((q) =>
          q.eq(q.field("projectId"), args.projectId),
        );
      }
    }

    const owned = await ownedQuery.collect();

    // 2. Get collaborative conversations where user is participant
    const participations = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // 3. Fetch collaborative conversations
    const collabConversations = await Promise.all(
      participations.map((p) => ctx.db.get(p.conversationId)),
    );

    // 4. Filter collaborative: not null, not archived, apply project filter
    let filteredCollab = collabConversations.filter(
      (c): c is NonNullable<typeof c> => c !== null && !c.archived,
    );

    if (args.projectId !== undefined) {
      if (args.projectId === "none") {
        filteredCollab = filteredCollab.filter((c) => !c.projectId);
      } else {
        filteredCollab = filteredCollab.filter(
          (c) => c.projectId === args.projectId,
        );
      }
    }

    // 5. Merge and dedupe (owner might also be in participants)
    const allConversations = [...owned];
    for (const collab of filteredCollab) {
      if (!allConversations.find((c) => c._id === collab._id)) {
        allConversations.push(collab);
      }
    }

    // 6. Sort: pinned first, then by lastMessageAt
    const sorted = allConversations.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.lastMessageAt - a.lastMessageAt;
    });

    // 7. Apply limit if specified
    return args.limit ? sorted.slice(0, args.limit) : sorted;
  },
});

export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    model: v.string(),
    title: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    parentConversationId: v.optional(v.id("conversations")),
    parentMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const conversationId = await ctx.db.insert("conversations", {
      userId: args.userId,
      title: args.title || "New Chat",
      model: args.model,
      systemPrompt: args.systemPrompt,
      pinned: false,
      archived: false,
      starred: false,
      messageCount: 0,
      lastMessageAt: Date.now(),
      parentConversationId: args.parentConversationId,
      parentMessageId: args.parentMessageId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return conversationId;
  },
});

export const updateLastMessageAt = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const togglePin = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) throw new Error("Not found");

    // Prevent pinning empty conversations
    if (!conv.pinned && conv.messageCount === 0) {
      throw new Error("Cannot pin empty conversation");
    }

    await ctx.db.patch(args.conversationId, {
      pinned: !conv.pinned,
      updatedAt: Date.now(),
    });
  },
});

export const toggleStar = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.conversationId, {
      starred: !conv.starred,
      updatedAt: Date.now(),
    });
  },
});

export const archive = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.conversationId, {
      archived: true,
      updatedAt: Date.now(),
    });
  },
});

export const deleteConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) throw new Error("Not found");

    // 1. Delete bookmarks
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    for (const bookmark of bookmarks) {
      await ctx.db.delete(bookmark._id);
    }

    // 2. Delete shares
    const shares = await ctx.db
      .query("shares")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    for (const share of shares) {
      await ctx.db.delete(share._id);
    }

    // 3. Nullify files conversationId (files can exist independently)
    const files = await ctx.db
      .query("files")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    for (const file of files) {
      await ctx.db.patch(file._id, { conversationId: undefined });
    }

    // 4. Nullify memories conversationId (memories can exist independently)
    const memories = await ctx.db
      .query("memories")
      .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
      .collect();
    for (const memory of memories) {
      await ctx.db.patch(memory._id, { conversationId: undefined });
    }

    // 5. Remove from projects - O(1) index lookup (Phase 3 migration)
    const junctions = await ctx.db
      .query("projectConversations")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    for (const junction of junctions) {
      await ctx.db.delete(junction._id);
    }

    // 6. Delete participants (for collaborative conversations)
    if (conv.isCollaborative) {
      const participants = await ctx.db
        .query("conversationParticipants")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", args.conversationId),
        )
        .collect();
      for (const p of participants) {
        await ctx.db.delete(p._id);
      }
    }

    // 7. Delete messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // 8. Delete conversation
    await ctx.db.delete(args.conversationId);
  },
});

export const rename = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.conversationId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const updateModel = mutation({
  args: {
    conversationId: v.id("conversations"),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.conversationId, {
      model: args.model,
      updatedAt: Date.now(),
    });
  },
});

export const updateTitle = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const getInternal = internalQuery({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const updateMemoryTracking = internalMutation({
  args: {
    id: v.id("conversations"),
    lastMemoryExtractionAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      lastMemoryExtractionAt: args.lastMemoryExtractionAt,
      updatedAt: Date.now(),
    });
  },
});

export const updateMemoryCache = internalMutation({
  args: {
    id: v.id("conversations"),
    cachedMemoryIds: v.array(v.id("memories")),
    lastMemoryFetchAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      cachedMemoryIds: args.cachedMemoryIds,
      lastMemoryFetchAt: args.lastMemoryFetchAt,
    });
  },
});

export const clearMemoryCache = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      cachedMemoryIds: undefined,
      lastMemoryFetchAt: undefined,
    });
    console.log(`[Cache] Cleared for conversation ${args.conversationId}`);
  },
});

export const updateExtractionCursor = internalMutation({
  args: {
    id: v.id("conversations"),
    lastExtractedMessageId: v.id("messages"),
    lastMemoryExtractionAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      lastExtractedMessageId: args.lastExtractedMessageId,
      lastMemoryExtractionAt: args.lastMemoryExtractionAt,
    });
  },
});

export const cleanupEmptyConversations = mutation({
  args: {
    keepOne: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const keepOne = args.keepOne ?? true; // Default: keep one empty conversation

    // Get all conversations for user
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();

    // Sort by lastMessageAt (most recent first)
    const sorted = conversations.sort(
      (a, b) => b.lastMessageAt - a.lastMessageAt,
    );

    // Find empty conversations by counting actual messages
    // (Don't trust cached messageCount - may be out of sync)
    const emptyConversations = [];
    for (const conv of sorted) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();

      const actualMessageCount = messages.length;

      // Log warning if messageCount is out of sync
      if (conv.messageCount !== actualMessageCount) {
        console.warn(
          `messageCount mismatch for conversation ${conv._id}: ` +
            `cached=${conv.messageCount}, actual=${actualMessageCount}`,
        );
        // Sync messageCount to actual value
        await ctx.db.patch(conv._id, { messageCount: actualMessageCount });
      }

      if (actualMessageCount === 0) {
        emptyConversations.push(conv);
      }
    }

    // Determine which conversations to delete
    const toDelete = keepOne
      ? emptyConversations.slice(1) // Keep first (most recent), delete rest
      : emptyConversations; // Delete all empty conversations

    // Cascade delete empty conversations
    let deletedCount = 0;
    for (const conv of toDelete) {
      // 1. Delete bookmarks
      const bookmarks = await ctx.db
        .query("bookmarks")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const bookmark of bookmarks) {
        await ctx.db.delete(bookmark._id);
      }

      // 2. Delete shares
      const shares = await ctx.db
        .query("shares")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const share of shares) {
        await ctx.db.delete(share._id);
      }

      // 3. Nullify files conversationId
      const files = await ctx.db
        .query("files")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const file of files) {
        await ctx.db.patch(file._id, { conversationId: undefined });
      }

      // 4. Nullify memories conversationId
      const memories = await ctx.db
        .query("memories")
        .filter((q) => q.eq(q.field("conversationId"), conv._id))
        .collect();
      for (const memory of memories) {
        await ctx.db.patch(memory._id, { conversationId: undefined });
      }

      // 5. Remove from project relationships via junction table
      const junctions = await ctx.db
        .query("projectConversations")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const junction of junctions) {
        await ctx.db.delete(junction._id);
      }

      // 6. Delete any messages (shouldn't be any, but just in case)
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      // 7. Delete conversation
      await ctx.db.delete(conv._id);
      deletedCount++;
    }

    // If we deleted all empty conversations and user has no conversations left,
    // create a new one to ensure they have at least one conversation
    if (!keepOne && deletedCount > 0) {
      const remainingConversations = await ctx.db
        .query("conversations")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("archived"), false))
        .collect();

      if (remainingConversations.length === 0) {
        // Create a new empty conversation
        await ctx.db.insert("conversations", {
          userId: user._id,
          model: "openai:gpt-5-mini",
          title: "New Chat",
          messageCount: 0,
          pinned: false,
          archived: false,
          starred: false,
          lastMessageAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    return { deletedCount };
  },
});

export const updateTokenUsage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    tokenUsage: v.object({
      systemTokens: v.number(),
      messagesTokens: v.number(),
      memoriesTokens: v.number(),
      totalTokens: v.number(),
      contextLimit: v.number(),
      lastCalculatedAt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      tokenUsage: args.tokenUsage,
      updatedAt: Date.now(),
    });
  },
});

export const getTokenUsage = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      return null;
    }

    return conversation.tokenUsage || null;
  },
});

/**
 * Update conversation token usage (Phase 6: per-model tracking + dual-write)
 */
export const updateConversationTokenUsage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    reasoningTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversationTokenUsage")
      .withIndex("by_conversation_model", (q) =>
        q.eq("conversationId", args.conversationId).eq("model", args.model),
      )
      .first();

    const now = Date.now();
    const totalTokens =
      args.inputTokens + args.outputTokens + (args.reasoningTokens || 0);

    if (existing) {
      // Increment existing record
      await ctx.db.patch(existing._id, {
        totalTokens: existing.totalTokens + totalTokens,
        inputTokens: existing.inputTokens + args.inputTokens,
        outputTokens: existing.outputTokens + args.outputTokens,
        reasoningTokens: existing.reasoningTokens
          ? existing.reasoningTokens + (args.reasoningTokens || 0)
          : args.reasoningTokens || 0,
        messageCount: existing.messageCount + 1,
        lastUpdatedAt: now,
      });
    } else {
      // Create new record
      await ctx.db.insert("conversationTokenUsage", {
        conversationId: args.conversationId,
        model: args.model,
        totalTokens,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        reasoningTokens: args.reasoningTokens,
        messageCount: 1,
        lastUpdatedAt: now,
        createdAt: now,
      });
    }

    // DUAL WRITE: Update legacy tokenUsage object
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation) {
      const oldUsage = conversation.tokenUsage || {
        systemTokens: 0,
        messagesTokens: 0,
        memoriesTokens: 0,
        totalTokens: 0,
        contextLimit: 0,
        lastCalculatedAt: Date.now(),
      };

      await ctx.db.patch(args.conversationId, {
        tokenUsage: {
          ...oldUsage,
          messagesTokens: oldUsage.messagesTokens + totalTokens,
          totalTokens: oldUsage.totalTokens + totalTokens,
          lastCalculatedAt: now,
        },
      });
    }
  },
});

/**
 * Get conversation token usage breakdown by model
 */
export const getConversationTokensByModel = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    const records = await ctx.db
      .query("conversationTokenUsage")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    return records.map((r) => ({
      model: r.model,
      totalTokens: r.totalTokens,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      reasoningTokens: r.reasoningTokens,
      messageCount: r.messageCount,
      lastUpdatedAt: r.lastUpdatedAt,
    }));
  },
});

/**
 * Get total conversation tokens across all models
 */
export const getTotalConversationTokens = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    const records = await ctx.db
      .query("conversationTokenUsage")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    return records.reduce((sum, r) => sum + r.totalTokens, 0);
  },
});

export const backfillMessageCounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const convos = await ctx.db.query("conversations").collect();
    let updated = 0;

    for (const conv of convos) {
      // Only backfill if messageCount is missing or undefined
      if (conv.messageCount === undefined || conv.messageCount === null) {
        const count = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .collect()
          .then((msgs) => msgs.length);

        await ctx.db.patch(conv._id, { messageCount: count });
        updated++;
      }
    }

    return { total: convos.length, updated };
  },
});

export const bulkDelete = mutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Verify ownership + cascade delete
    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }

      // 1. Delete bookmarks
      const bookmarks = ctx.db
        .query("bookmarks")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId));
      for await (const bookmark of bookmarks) {
        await ctx.db.delete(bookmark._id);
      }

      // 2. Delete shares
      const shares = ctx.db
        .query("shares")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId));
      for await (const share of shares) {
        await ctx.db.delete(share._id);
      }

      // 3. Nullify files conversationId (files can exist independently)
      const files = ctx.db
        .query("files")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId));
      for await (const file of files) {
        await ctx.db.patch(file._id, { conversationId: undefined });
      }

      // 4. Nullify memories conversationId (memories can exist independently)
      const memories = ctx.db
        .query("memories")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId));
      for await (const memory of memories) {
        await ctx.db.patch(memory._id, { conversationId: undefined });
      }

      // 5. Remove from project relationships via junction table
      const junctions = ctx.db
        .query("projectConversations")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId));
      for await (const junction of junctions) {
        await ctx.db.delete(junction._id);
      }

      // 6. Delete messages
      const messages = ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId));
      for await (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      // 7. Delete conversation
      await ctx.db.delete(convId);
    }

    return { deletedCount: args.conversationIds.length };
  },
});

export const bulkArchive = mutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }

      await ctx.db.patch(convId, {
        archived: true,
        updatedAt: Date.now(),
      });
    }

    return { archivedCount: args.conversationIds.length };
  },
});

export const bulkPin = mutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }

      await ctx.db.patch(convId, {
        pinned: true,
        updatedAt: Date.now(),
      });
    }

    return { pinnedCount: args.conversationIds.length };
  },
});

export const bulkUnpin = mutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }

      await ctx.db.patch(convId, {
        pinned: false,
        updatedAt: Date.now(),
      });
    }

    return { unpinnedCount: args.conversationIds.length };
  },
});

export const bulkStar = mutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }

      await ctx.db.patch(convId, {
        starred: true,
        updatedAt: Date.now(),
      });
    }

    return { starredCount: args.conversationIds.length };
  },
});

export const bulkUnstar = mutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }

      await ctx.db.patch(convId, {
        starred: false,
        updatedAt: Date.now(),
      });
    }

    return { unstarredCount: args.conversationIds.length };
  },
});

export const createConsolidationConversation = mutation({
  args: {
    comparisonGroupId: v.string(),
    consolidationModel: v.string(),
  },
  returns: v.object({ conversationId: v.id("conversations") }),
  handler: async (
    ctx,
    args,
  ): Promise<{ conversationId: Id<"conversations"> }> => {
    const user = await getCurrentUserOrCreate(ctx);

    // 1. Fetch comparison messages
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_comparison_group", (q) =>
        q.eq("comparisonGroupId", args.comparisonGroupId),
      )
      .collect();

    // 2. Separate user message and assistant responses
    let userMessage = allMessages.find((m) => m.role === "user");
    const responses = allMessages.filter((m) => m.role === "assistant");

    // Fallback: For old messages without comparisonGroupId on user message,
    // find the user message by looking at the conversation of the first response
    if (!userMessage && responses.length > 0) {
      const conversationId = responses[0].conversationId;
      const allConversationMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId),
        )
        .order("asc")
        .collect();

      // Find the user message that came right before the comparison responses
      const firstResponseTime = Math.min(...responses.map((r) => r.createdAt));
      userMessage = allConversationMessages
        .filter((m) => m.role === "user" && m.createdAt < firstResponseTime)
        .sort((a, b) => b.createdAt - a.createdAt)[0];
    }

    if (!userMessage || responses.length === 0) {
      throw new Error(
        `Invalid comparison group: found ${allMessages.length} messages (${responses.length} assistant, ${userMessage ? 1 : 0} user) for groupId ${args.comparisonGroupId}`,
      );
    }

    // 3. Build consolidation prompt (using imported helper when available)
    const modelList = responses.map((r) => r.model || "unknown").join(", ");
    let consolidationPrompt = `Here are ${responses.length} responses from ${modelList} about:\n\n`;
    consolidationPrompt += `**Original prompt:** "${userMessage.content}"\n\n`;

    for (const r of responses) {
      consolidationPrompt += `**Response from ${r.model || "unknown"}:**\n${r.content}\n\n`;
    }

    consolidationPrompt +=
      "Can you consolidate all of this information into one comprehensive, well-organized response? Identify common themes, reconcile any differences, and synthesize the best insights from each response.";

    // 4. Create new conversation
    const conversationId = await ctx.db.insert("conversations", {
      userId: user._id,
      model: args.consolidationModel,
      title: `Consolidation: ${userMessage.content.slice(0, 50)}...`,
      pinned: false,
      archived: false,
      starred: false,
      messageCount: 0,
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 5. Insert user message with consolidated prompt
    await ctx.db.insert("messages", {
      conversationId,
      userId: user._id,
      role: "user",
      content: consolidationPrompt,
      status: "complete",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 6. Insert pending assistant message
    const assistantMessageId = await ctx.db.insert("messages", {
      conversationId,
      userId: user._id,
      role: "assistant",
      content: "",
      status: "pending",
      model: args.consolidationModel,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 7. Schedule generation
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId,
      assistantMessageId,
      modelId: args.consolidationModel,
      userId: user._id,
    });

    return { conversationId };
  },
});

export const consolidateInSameChat = mutation({
  args: {
    conversationId: v.id("conversations"),
    comparisonGroupId: v.string(),
    consolidationModel: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // 1. Fetch comparison group messages
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_comparison_group", (q) =>
        q.eq("comparisonGroupId", args.comparisonGroupId),
      )
      .collect();

    // 2. Separate user message and assistant responses
    const userMessage = allMessages.find((m) => m.role === "user");
    const responses = allMessages.filter((m) => m.role === "assistant");

    if (!userMessage || responses.length === 0) {
      throw new Error("Invalid comparison group");
    }

    // 3. Build consolidation prompt
    const modelList = responses.map((r) => r.model || "unknown").join(", ");
    let consolidationPrompt = `Here are ${responses.length} responses from ${modelList} about:\n\n`;
    consolidationPrompt += `**Original prompt:** "${userMessage.content}"\n\n`;

    for (const r of responses) {
      consolidationPrompt += `**Response from ${r.model || "unknown"}:**\n${r.content}\n\n`;
    }

    consolidationPrompt +=
      "Can you consolidate all of this information into one comprehensive, well-organized response? Identify common themes, reconcile any differences, and synthesize the best insights from each response.";

    // 4. Insert pending consolidated assistant message (NO comparisonGroupId)
    const consolidatedMessageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: user._id,
      role: "assistant",
      content: "",
      status: "pending",
      model: args.consolidationModel,
      isConsolidation: true, // Mark as consolidated message
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 5. Link comparison messages to consolidated message
    for (const response of responses) {
      await ctx.db.patch(response._id, {
        consolidatedMessageId, // Link to consolidated message
      });
    }

    // 6. Update conversation messageCount (+1 for consolidated message)
    const conversation = await ctx.db.get(args.conversationId);
    await ctx.db.patch(args.conversationId, {
      messageCount: (conversation?.messageCount || 0) + 1,
      lastMessageAt: Date.now(),
    });

    // 7. Schedule generation with consolidation prompt as system context
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId: args.conversationId,
      assistantMessageId: consolidatedMessageId,
      modelId: args.consolidationModel,
      userId: user._id,
      systemPromptOverride: consolidationPrompt, // Pass consolidation context
    });

    return { messageId: consolidatedMessageId };
  },
});

export const getChildBranches = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get child conversations that branch from this conversation
    const childBranches = await ctx.db
      .query("conversations")
      .withIndex("by_parent_conversation", (q) =>
        q.eq("parentConversationId", args.conversationId),
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    return childBranches;
  },
});

export const getChildBranchesFromMessage = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get child conversations that branch from this specific message
    const childBranches = await ctx.db
      .query("conversations")
      .withIndex("by_parent_conversation")
      .filter((q) =>
        q.and(
          q.eq(q.field("parentMessageId"), args.messageId),
          q.eq(q.field("userId"), user._id),
        ),
      )
      .collect();

    return childBranches;
  },
});

/**
 * Set model recommendation for a conversation
 * Internal mutation - only called by triage action
 */
export const setModelRecommendation = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    recommendation: v.object({
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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      modelRecommendation: args.recommendation,
    });
  },
});

/**
 * Dismiss model recommendation for a conversation
 * User-facing mutation - marks recommendation as dismissed
 */
export const dismissModelRecommendation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Verify user owns this conversation
    if (conversation.userId !== user._id) {
      throw new Error("Not authorized");
    }

    if (!conversation.modelRecommendation) return;

    await ctx.db.patch(args.conversationId, {
      modelRecommendation: {
        ...conversation.modelRecommendation,
        dismissed: true,
      },
    });
  },
});

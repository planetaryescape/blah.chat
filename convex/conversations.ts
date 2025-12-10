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

export const create = mutation({
  args: {
    model: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const conversationId = await ctx.db.insert("conversations", {
      userId: user._id,
      title: args.title || "New Chat",
      model: args.model,
      pinned: false,
      archived: false,
      starred: false,
      messageCount: 0,
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
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

    // DEFAULT MODE: Recent conversations
    let query = ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("archived"), false));

    // Apply project filter
    if (args.projectId !== undefined) {
      if (args.projectId === "none") {
        query = query.filter((q) => q.eq(q.field("projectId"), undefined));
      } else {
        query = query.filter((q) => q.eq(q.field("projectId"), args.projectId));
      }
    }

    const convos = args.limit
      ? await query.take(args.limit)
      : await query.collect();

    // Sort: pinned first, then by lastMessageAt
    return convos.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.lastMessageAt - a.lastMessageAt;
    });
  },
});

export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    model: v.string(),
    title: v.optional(v.string()),
    parentConversationId: v.optional(v.id("conversations")),
    parentMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const conversationId = await ctx.db.insert("conversations", {
      userId: args.userId,
      title: args.title || "New Chat",
      model: args.model,
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

    // 5. Remove from projects conversationIds arrays
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const project of projects) {
      if (project.conversationIds.includes(args.conversationId)) {
        await ctx.db.patch(project._id, {
          conversationIds: project.conversationIds.filter(
            (id) => id !== args.conversationId,
          ),
        });
      }
    }

    // 6. Delete messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // 7. Delete conversation
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

      // 5. Remove from projects conversationIds arrays
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      for (const project of projects) {
        if (project.conversationIds.includes(conv._id)) {
          await ctx.db.patch(project._id, {
            conversationIds: project.conversationIds.filter(
              (id) => id !== conv._id,
            ),
          });
        }
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
      const bookmarks = await ctx.db
        .query("bookmarks")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
        .collect();
      for (const bookmark of bookmarks) {
        await ctx.db.delete(bookmark._id);
      }

      // 2. Delete shares
      const shares = await ctx.db
        .query("shares")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
        .collect();
      for (const share of shares) {
        await ctx.db.delete(share._id);
      }

      // 3. Nullify files conversationId (files can exist independently)
      const files = await ctx.db
        .query("files")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
        .collect();
      for (const file of files) {
        await ctx.db.patch(file._id, { conversationId: undefined });
      }

      // 4. Nullify memories conversationId (memories can exist independently)
      const memories = await ctx.db
        .query("memories")
        .filter((q) => q.eq(q.field("conversationId"), convId))
        .collect();
      for (const memory of memories) {
        await ctx.db.patch(memory._id, { conversationId: undefined });
      }

      // 5. Remove from projects conversationIds arrays
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      for (const project of projects) {
        if (project.conversationIds.includes(convId)) {
          await ctx.db.patch(project._id, {
            conversationIds: project.conversationIds.filter(
              (id) => id !== convId,
            ),
          });
        }
      }

      // 6. Delete messages
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
        .collect();
      for (const msg of messages) {
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

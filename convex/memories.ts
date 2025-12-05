import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

export const create = internalMutation({
  args: {
    userId: v.id("users"),
    content: v.string(),
    embedding: v.array(v.float64()),
    conversationId: v.optional(v.id("conversations")),
    metadata: v.object({
      category: v.string(),
      importance: v.number(),
      reasoning: v.optional(v.string()),
      extractedAt: v.number(),
      sourceConversationId: v.optional(v.id("conversations")),
    }),
  },
  handler: async (ctx, args) => {
    const memoryId = await ctx.db.insert("memories", {
      userId: args.userId,
      content: args.content,
      embedding: args.embedding,
      conversationId: args.conversationId,
      metadata: args.metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return memoryId;
  },
});

export const search = internalQuery({
  args: {
    userId: v.id("users"),
    query: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // For now, return simple text-based search until vector index is properly set up
    // Vector search implementation will be added when schema is migrated
    const allMemories = await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit);

    return allMemories;
  },
});

export const getMemoriesByIds = internalQuery({
  args: { ids: v.array(v.id("memories")) },
  handler: async (ctx, args): Promise<Doc<"memories">[]> => {
    const memories: Doc<"memories">[] = [];
    for (const id of args.ids) {
      const memory = await ctx.db.get(id);
      if (memory) memories.push(memory);
    }
    return memories;
  },
});

export const searchByEmbedding = internalAction({
  args: {
    userId: v.id("users"),
    embedding: v.array(v.float64()),
    limit: v.number(),
  },
  handler: async (ctx, args): Promise<Doc<"memories">[]> => {
    const results = await ctx.vectorSearch("memories", "by_embedding", {
      vector: args.embedding,
      limit: args.limit,
      filter: (q) => q.eq("userId", args.userId),
    });

    const ids = results.map((r) => r._id);
    const memories = await ctx.runQuery(internal.memories.getMemoriesByIds, {
      ids,
    });

    return memories;
  },
});

export const internalList = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 100);
    return memories;
  },
});

import { paginationOptsValidator } from "convex/server";

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return empty result if not authenticated to prevent errors during initial load
      return { page: [], isDone: true, continueCursor: "" };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return { page: [], isDone: true, continueCursor: "" };

    const memories = await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);

    return memories;
  },
});

export const listAll = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const memories = await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(1000);

    return memories;
  },
});

export const deleteMemory = mutation({
  args: {
    id: v.id("memories"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const memory = await ctx.db.get(args.id);
    if (!memory) throw new Error("Memory not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || memory.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});

export const triggerExtraction = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || conversation.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Schedule extraction
    await ctx.scheduler.runAfter(0, internal.memories.extract.extractMemories, {
      conversationId: args.conversationId,
    });
  },
});

export const createManual = mutation({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // For manual memories, we'll use a placeholder embedding for now
    // Ideally, we should generate an embedding here, but that requires an action
    // We can schedule an action to generate the embedding later
    const embedding = new Array(1536).fill(0);

    const memoryId = await ctx.db.insert("memories", {
      userId: user._id,
      content: args.content,
      embedding: embedding,
      metadata: {
        category: "user_profile",
        importance: 1,
        extractedAt: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return memoryId;
  },
});

export const update = mutation({
  args: {
    id: v.id("memories"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const memory = await ctx.db.get(args.id);
    if (!memory) throw new Error("Memory not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || memory.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      content: args.content,
      updatedAt: Date.now(),
    });
  },
});

export const scanRecentConversations = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Get recent conversations (last 5)
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(5);

    let triggeredCount = 0;

    for (const conversation of conversations) {
      // Check if we have enough messages
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .take(5); // Just check if there are at least a few messages

      if (messages.length >= 3) {
        await ctx.scheduler.runAfter(
          0,
          internal.memories.extract.extractMemories,
          {
            conversationId: conversation._id,
          },
        );
        triggeredCount++;
      }
    }

    return { triggered: triggeredCount };
  },
});

// Migration: Delete all memories for current user
export const deleteAllMemories = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Get all memories for user
    const memories = await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Delete all memories
    for (const memory of memories) {
      await ctx.db.delete(memory._id);
    }

    console.log(`Deleted ${memories.length} memories for user ${user._id}`);

    return { deleted: memories.length };
  },
});

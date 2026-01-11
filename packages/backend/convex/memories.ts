import { embed } from "ai";
import { v } from "convex/values";
import { EMBEDDING_MODEL } from "@/lib/ai/operational-models";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  mutation,
} from "./_generated/server";
import { logger } from "./lib/logger";

export * as consolidation from "./memories/consolidation";
export * as deleteModule from "./memories/delete";
export * as expiration from "./memories/expiration";
export * as extract from "./memories/extract";
export * as mutations from "./memories/mutations";
// ===== Re-exports from submodules =====
export * as queries from "./memories/queries";
export * as save from "./memories/save";
export * as hybridSearch from "./memories/search";

// ===== Core Internal Mutations =====

export const create = internalMutation({
  args: {
    userId: v.id("users"),
    content: v.string(),
    embedding: v.array(v.float64()),
    conversationId: v.optional(v.id("conversations")),
    sourceMessageIds: v.optional(v.array(v.id("messages"))),
    metadata: v.object({
      category: v.string(),
      importance: v.number(),
      reasoning: v.optional(v.string()),
      extractedAt: v.number(),
      sourceConversationId: v.optional(v.id("conversations")),
      confidence: v.optional(v.number()),
      verifiedBy: v.optional(
        v.union(
          v.literal("auto"),
          v.literal("manual"),
          v.literal("consolidated"),
        ),
      ),
      expiresAt: v.optional(v.number()),
      version: v.optional(v.number()),
      expirationHint: v.optional(
        v.union(
          v.literal("contextual"),
          v.literal("preference"),
          v.literal("deadline"),
          v.literal("temporary"),
        ),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const memoryId = await ctx.db.insert("memories", {
      userId: args.userId,
      content: args.content,
      embedding: args.embedding,
      conversationId: args.conversationId,
      sourceMessageIds: args.sourceMessageIds,
      metadata: args.metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return memoryId;
  },
});

export const updateWithEmbedding = internalMutation({
  args: {
    id: v.id("memories"),
    content: v.string(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      content: args.content,
      embedding: args.embedding,
      updatedAt: Date.now(),
    });
  },
});

export const deleteInternal = internalMutation({
  args: {
    id: v.id("memories"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ===== Public Mutations =====

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

    const embedding = new Array(1536).fill(0);

    const memoryId = await ctx.db.insert("memories", {
      userId: user._id,
      content: args.content,
      embedding: embedding,
      metadata: {
        category: "user_profile",
        importance: 8,
        confidence: 1.0,
        verifiedBy: "manual",
        version: 1,
        extractedAt: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return memoryId;
  },
});

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

    const memories = await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const memory of memories) {
      await ctx.db.delete(memory._id);
    }

    logger.info("Deleted all memories for user", {
      count: memories.length,
      userId: user._id,
    });

    return { deleted: memories.length };
  },
});

export const deleteSelected = mutation({
  args: {
    ids: v.array(v.id("memories")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    let deletedCount = 0;

    for (const id of args.ids) {
      const memory = await ctx.db.get(id);
      if (memory && memory.userId === user._id) {
        await ctx.db.delete(id);
        deletedCount++;
      }
    }

    logger.info("Deleted selected memories for user", {
      count: deletedCount,
      userId: user._id,
    });

    return { deleted: deletedCount };
  },
});

// ===== Extraction Triggers =====

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

    await ctx.scheduler.runAfter(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.memories.extract.extractMemories,
      {
        conversationId: args.conversationId,
      },
    );
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

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(5);

    let triggeredCount = 0;

    for (const conversation of conversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .take(5);

      if (messages.length >= 3) {
        await ctx.scheduler.runAfter(
          0,
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
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

// ===== Search Actions =====

type MemoryWithScore = Doc<"memories"> & { _score: number };

export const searchByEmbedding = internalAction({
  args: {
    userId: v.id("users"),
    embedding: v.array(v.float64()),
    limit: v.number(),
  },
  handler: async (ctx, args): Promise<MemoryWithScore[]> => {
    const results = await ctx.vectorSearch("memories", "by_embedding", {
      vector: args.embedding,
      limit: args.limit,
      filter: (q) => q.eq("userId", args.userId),
    });

    const scores = new Map(
      results.map((r) => [r._id, (r as any)._score as number]),
    );

    const ids = results.map((r) => r._id);
    const memories: Doc<"memories">[] = await ctx.runQuery(
      internal.lib.helpers.getMemoriesByIds,
      {
        ids,
      },
    );

    return memories.map((m) => ({
      ...m,
      _score: scores.get(m._id) || 0,
    }));
  },
});

export const createMemoryFromSelection = action({
  args: {
    content: v.string(),
    sourceMessageId: v.optional(v.id("messages")),
    sourceConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const user: Doc<"users"> | null = await ctx.runQuery(
      internal.lib.helpers.getCurrentUser,
      {},
    );
    if (!user) throw new Error("User not found");

    const { embedding } = await embed({
      model: EMBEDDING_MODEL,
      value: args.content,
    });

    await ctx.runMutation(internal.memories.create, {
      userId: user._id,
      content: args.content,
      embedding: embedding,
      conversationId: args.sourceConversationId,
      metadata: {
        category: "user_profile",
        importance: 8,
        confidence: 1.0,
        verifiedBy: "manual",
        version: 1,
        extractedAt: Date.now(),
        sourceConversationId: args.sourceConversationId,
      },
    });
  },
});

// ===== Backward Compatibility Re-exports =====

// From consolidation.ts
export {
  consolidateUserMemories,
  migrateUserMemories,
} from "./memories/consolidation";
// From queries.ts
export {
  getMemoriesByIds,
  getMemoryById,
  internalList,
  list,
  listAll,
  listAllInternal,
  listFiltered,
  search,
} from "./memories/queries";

import {
  calculateRetention,
  updateStability,
} from "@blah-chat/cognitive-memory";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalQuery, mutation, query } from "../_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "../lib/userSync";

const MEMORY_TYPE = v.union(
  v.literal("episodic"),
  v.literal("semantic"),
  v.literal("procedural"),
);

const VERIFIED_BY = v.union(
  v.literal("auto"),
  v.literal("manual"),
  v.literal("consolidated"),
);

const EXPIRATION_HINT = v.union(
  v.literal("contextual"),
  v.literal("preference"),
  v.literal("deadline"),
  v.literal("temporary"),
);

function toImportance01(importance10: number | undefined): number {
  const raw = importance10 ?? 5;
  return Math.max(0, Math.min(1, raw / 10));
}

export const createCognitiveMemory = mutation({
  args: {
    userId: v.id("users"),
    content: v.string(),
    embedding: v.array(v.float64()),
    conversationId: v.optional(v.id("conversations")),
    sourceMessageIds: v.optional(v.array(v.id("messages"))),
    metadata: v.object({
      category: v.string(),
      importance: v.optional(v.number()), // 1-10 scale
      reasoning: v.optional(v.string()),
      extractedAt: v.optional(v.number()),
      sourceConversationId: v.optional(v.id("conversations")),
      confidence: v.optional(v.number()),
      verifiedBy: v.optional(VERIFIED_BY),
      expiresAt: v.optional(v.number()),
      version: v.optional(v.number()),
      expirationHint: v.optional(EXPIRATION_HINT),
    }),
    memoryType: v.optional(MEMORY_TYPE),
    stability: v.optional(v.number()),
    accessCount: v.optional(v.number()),
    lastAccessed: v.optional(v.number()),
    retention: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    if (user._id !== args.userId) throw new Error("Unauthorized");

    const now = Date.now();
    const memoryType = args.memoryType ?? "semantic";
    const stability = args.stability ?? 0.3;
    const accessCount = args.accessCount ?? 0;
    const lastAccessed = args.lastAccessed ?? now;

    const retention =
      args.retention ??
      calculateRetention({
        stability,
        importance: toImportance01(args.metadata.importance),
        lastAccessed,
        memoryType,
      });

    const id = await ctx.db.insert("memories", {
      userId: args.userId,
      content: args.content,
      embedding: args.embedding,
      conversationId: args.conversationId,
      sourceMessageIds: args.sourceMessageIds,
      metadata: {
        ...args.metadata,
        extractedAt: args.metadata.extractedAt ?? now,
        verifiedBy: args.metadata.verifiedBy ?? "manual",
        version: args.metadata.version ?? 1,
      },
      memoryType,
      stability,
      accessCount,
      lastAccessed,
      retention,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

export const updateCognitiveMemory = mutation({
  args: {
    id: v.id("memories"),
    content: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())),
    memoryType: v.optional(MEMORY_TYPE),
    stability: v.optional(v.number()),
    accessCount: v.optional(v.number()),
    lastAccessed: v.optional(v.number()),
    retention: v.optional(v.number()),
    importance: v.optional(v.number()), // 1-10 scale (stored in metadata.importance)
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const memory = await ctx.db.get(args.id);
    if (!memory) throw new Error("Memory not found");
    if (memory.userId !== user._id) throw new Error("Unauthorized");

    const patch: Partial<Doc<"memories">> = {
      updatedAt: Date.now(),
    };

    if (args.content !== undefined) patch.content = args.content;
    if (args.embedding !== undefined) patch.embedding = args.embedding;
    if (args.memoryType !== undefined) patch.memoryType = args.memoryType;
    if (args.stability !== undefined) patch.stability = args.stability;
    if (args.accessCount !== undefined) patch.accessCount = args.accessCount;
    if (args.lastAccessed !== undefined) patch.lastAccessed = args.lastAccessed;
    if (args.retention !== undefined) patch.retention = args.retention;

    if (args.importance !== undefined) {
      patch.metadata = { ...memory.metadata, importance: args.importance };
    }

    await ctx.db.patch(args.id, patch);
    return null;
  },
});

export const deleteCognitiveMemory = mutation({
  args: { id: v.id("memories") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const memory = await ctx.db.get(args.id);
    if (!memory) return null;
    if (memory.userId !== user._id) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
    return null;
  },
});

export const deleteCognitiveMemories = mutation({
  args: { ids: v.array(v.id("memories")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    for (const id of args.ids) {
      const memory = await ctx.db.get(id);
      if (!memory) continue;
      if (memory.userId !== user._id) throw new Error("Unauthorized");
      await ctx.db.delete(id);
    }
    return null;
  },
});

export const getCognitiveMemory = query({
  args: { id: v.id("memories") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const memory = await ctx.db.get(args.id);
    if (!memory) return null;
    if (memory.userId !== user._id) return null;
    return memory;
  },
});

export const getCognitiveMemories = query({
  args: { ids: v.array(v.id("memories")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const out: Doc<"memories">[] = [];
    for (const id of args.ids) {
      const memory = await ctx.db.get(id);
      if (!memory) continue;
      if (memory.userId !== user._id) continue;
      out.push(memory);
    }
    return out;
  },
});

export const queryCognitiveMemories = query({
  args: {
    userId: v.optional(v.id("users")),
    memoryTypes: v.optional(v.array(MEMORY_TYPE)),
    minRetention: v.optional(v.number()),
    minImportance: v.optional(v.number()), // 0-1 (SDK) or 1-10 (Convex)
    createdAfter: v.optional(v.number()),
    createdBefore: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const userId = args.userId ?? user._id;
    if (userId !== user._id) return [];

    let memories = await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1000);

    if (args.memoryTypes && args.memoryTypes.length > 0) {
      const set = new Set(args.memoryTypes);
      memories = memories.filter((m) => m.memoryType && set.has(m.memoryType));
    }

    if (args.createdAfter !== undefined) {
      memories = memories.filter((m) => m.createdAt >= args.createdAfter!);
    }
    if (args.createdBefore !== undefined) {
      memories = memories.filter((m) => m.createdAt <= args.createdBefore!);
    }

    if (args.minRetention !== undefined) {
      memories = memories.filter(
        (m) => (m.retention ?? 1.0) >= args.minRetention!,
      );
    }

    if (args.minImportance !== undefined) {
      const min =
        args.minImportance <= 1 ? args.minImportance * 10 : args.minImportance;
      memories = memories.filter((m) => (m.metadata.importance ?? 0) >= min);
    }

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 100;
    return memories.slice(offset, offset + limit);
  },
});

export const findFadingMemories = query({
  args: { userId: v.id("users"), maxRetention: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    if (user._id !== args.userId) return [];

    const results = await ctx.db
      .query("memories")
      .withIndex("by_retention", (q) =>
        q.eq("userId", args.userId).lt("retention", args.maxRetention),
      )
      .take(200);

    return results;
  },
});

export const findStableMemories = query({
  args: {
    userId: v.id("users"),
    minStability: v.number(),
    minAccessCount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    if (user._id !== args.userId) return [];

    const results = await ctx.db
      .query("memories")
      .withIndex("by_stability", (q) =>
        q.eq("userId", args.userId).gte("stability", args.minStability),
      )
      .take(500);

    return results.filter((m) => (m.accessCount ?? 0) >= args.minAccessCount);
  },
});

export const markSuperseded = mutation({
  args: {
    memoryIds: v.array(v.id("memories")),
    summaryId: v.id("memories"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) throw new Error("Memory not found");
    if (summary.userId !== user._id) throw new Error("Unauthorized");

    for (const id of args.memoryIds) {
      const memory = await ctx.db.get(id);
      if (!memory) continue;
      if (memory.userId !== user._id) throw new Error("Unauthorized");
      await ctx.db.patch(id, {
        metadata: { ...memory.metadata, supersededBy: args.summaryId },
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

export const batchUpdateRetention = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("memories"),
        retention: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    for (const { id, retention } of args.updates) {
      const memory = await ctx.db.get(id);
      if (!memory) continue;
      if (memory.userId !== user._id) throw new Error("Unauthorized");
      await ctx.db.patch(id, { retention, updatedAt: Date.now() });
    }
    return null;
  },
});

export const strengthenMemories = mutation({
  args: { ids: v.array(v.id("memories")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const now = Date.now();

    for (const id of args.ids) {
      const memory = await ctx.db.get(id);
      if (!memory) continue;
      if (memory.userId !== user._id) throw new Error("Unauthorized");

      const lastAccessed = memory.lastAccessed ?? memory.createdAt;
      const daysSinceAccess = (now - lastAccessed) / (1000 * 60 * 60 * 24);

      const stability = updateStability(
        memory.stability ?? 0.3,
        daysSinceAccess,
      );
      const retention = calculateRetention({
        stability,
        importance: toImportance01(memory.metadata.importance),
        lastAccessed: now,
        memoryType: memory.memoryType ?? "semantic",
      });

      await ctx.db.patch(id, {
        stability,
        accessCount: (memory.accessCount ?? 0) + 1,
        lastAccessed: now,
        retention,
        updatedAt: now,
      });
    }

    return null;
  },
});

export const getCurrentUserIdForAction = internalQuery({
  args: {},
  handler: async (ctx): Promise<Id<"users"> | null> => {
    const user = await getCurrentUser(ctx);
    return user?._id ?? null;
  },
});

export const cognitiveVectorSearch = action({
  args: {
    embedding: v.array(v.float64()),
    userId: v.id("users"),
    limit: v.number(),
    memoryTypes: v.optional(v.array(MEMORY_TYPE)),
    minRetention: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUserId = await (ctx.runQuery as any)(
      // @ts-ignore - TS recursion limit with Convex api types
      internal.memories.cognitive.getCurrentUserIdForAction,
      {},
    );
    if (!currentUserId || currentUserId !== args.userId) {
      return [];
    }

    const searchLimit = Math.min(args.limit * 3, 60);

    const results = await ctx.vectorSearch("memories", "by_embedding", {
      vector: args.embedding,
      limit: searchLimit,
      filter: (q) => q.eq("userId", args.userId),
    });

    const ids = results.map((r) => r._id);
    const memories: Doc<"memories">[] = await (ctx.runQuery as any)(
      // @ts-ignore - TS recursion limit with Convex api types
      internal.lib.helpers.getMemoriesByIds,
      { ids },
    );

    const byId = new Map<string, Doc<"memories">>();
    for (const m of memories) byId.set(m._id, m);

    let scored: Array<{ memory: Doc<"memories">; relevanceScore: number }> = [];
    for (const r of results) {
      const memory = byId.get(r._id);
      if (!memory) continue;
      scored.push({ memory, relevanceScore: r._score });
    }

    if (args.memoryTypes && args.memoryTypes.length > 0) {
      const set = new Set(args.memoryTypes);
      scored = scored.filter(
        (s) => s.memory.memoryType && set.has(s.memory.memoryType),
      );
    }

    if (args.minRetention !== undefined) {
      scored = scored.filter(
        (s) => (s.memory.retention ?? 1.0) >= args.minRetention!,
      );
    }

    return scored.slice(0, args.limit);
  },
});

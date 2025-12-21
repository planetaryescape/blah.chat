import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalQuery, query } from "../_generated/server";

// ===== Public Queries =====

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
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

export const listFiltered = query({
  args: {
    category: v.optional(v.string()),
    sortBy: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    // Search if query provided
    if (args.searchQuery && args.searchQuery.length > 0) {
      const searchResults = await ctx.db
        .query("memories")
        .withSearchIndex("search_content", (q) =>
          // biome-ignore lint/style/noNonNullAssertion: validated above
          q
            .search("content", args.searchQuery!)
            .eq("userId", user._id),
        )
        .take(100);

      let results = searchResults;
      if (args.category) {
        results = results.filter((m) => m.metadata?.category === args.category);
      }

      return sortMemories(results, args.sortBy || "date");
    }

    // No search - use index
    let memories = await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(1000);

    if (args.category) {
      memories = memories.filter((m) => m.metadata?.category === args.category);
    }

    return sortMemories(memories, args.sortBy || "date");
  },
});

function sortMemories(memories: Doc<"memories">[], sortBy: string) {
  const sorted = [...memories];

  switch (sortBy) {
    case "importance":
      return sorted.sort(
        (a, b) => (b.metadata?.importance || 0) - (a.metadata?.importance || 0),
      );
    case "confidence":
      return sorted.sort(
        (a, b) => (b.metadata?.confidence || 0) - (a.metadata?.confidence || 0),
      );
    default:
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
  }
}

// ===== Internal Queries =====

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

export const listAllInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(1000);

    return memories;
  },
});

export const search = internalQuery({
  args: {
    userId: v.id("users"),
    query: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
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

export const getMemoryById = internalQuery({
  args: { id: v.id("memories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

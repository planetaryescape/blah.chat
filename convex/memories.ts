import { embed, generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { getGatewayOptions } from "../src/lib/ai/gateway";
import {
  EMBEDDING_MODEL,
  MEMORY_PROCESSING_MODEL,
} from "../src/lib/ai/operational-models";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const rephrasedMemorySchema = z.object({
  content: z.string(),
});

const consolidatedMemoriesSchema = z.object({
  memories: z.array(
    z.object({
      content: z.string(),
      category: z.enum([
        "identity",
        "preference",
        "project",
        "context",
        "relationship",
      ]),
      importance: z.number().min(1).max(10),
      sourceIds: z.array(z.string()),
      operation: z.enum(["merge", "dedupe", "keep"]),
      reasoning: z.string().min(10).max(1000), // Required: Preserve/combine from sources
    }),
  ),
});

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
      // Phase 3: Confidence scoring
      confidence: v.optional(v.number()),
      verifiedBy: v.optional(
        v.union(
          v.literal("auto"),
          v.literal("manual"),
          v.literal("consolidated"),
        ),
      ),
      // Phase 3: TTL & versioning
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

export const getMemoryById = internalQuery({
  args: { id: v.id("memories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Phase 7: Return type includes similarity score from native vector search
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

    // Preserve scores from vector search results
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

    // Attach scores to memories (Phase 7: no manual cosine similarity)
    return memories.map((m) => ({
      ...m,
      _score: scores.get(m._id) || 0,
    }));
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
import { getModel } from "@/lib/ai/registry";

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
          q.search("content", args.searchQuery!).eq("userId", user._id),
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
        importance: 8, // Manual memories are important
        confidence: 1.0, // Manual = 100% confident/verified
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

export const migrateUserMemories = action({
  handler: async (
    ctx,
  ): Promise<{ migrated: number; skipped: number; total: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get current user
    const user = await (
      ctx.runQuery as (ref: any, args: any) => Promise<Doc<"users"> | null>
    )(internal.lib.helpers.getCurrentUser, {});
    if (!user) throw new Error("User not found");

    // 1. Fetch user's memories
    const memories = await (
      ctx.runQuery as (ref: any, args: any) => Promise<Doc<"memories">[]>
    )(internal.lib.helpers.listAllMemories, { userId: user._id });

    if (memories.length === 0) {
      return { migrated: 0, skipped: 0, total: 0 };
    }

    let migrated = 0;
    let skipped = 0;

    // 2. For each memory:
    for (const memory of memories) {
      try {
        // 3. Use LLM to rephrase
        const result = await generateObject({
          model: getModel(MEMORY_PROCESSING_MODEL.id),
          schema: rephrasedMemorySchema,
          providerOptions: getGatewayOptions(
            MEMORY_PROCESSING_MODEL.id,
            undefined,
            ["memory-rephrase"],
          ),
          prompt: `Rephrase this memory to third-person perspective for AI context injection.

Original memory: "${memory.content}"

REPHRASING RULES:
- Convert first-person to third-person: "I am X" → "User is X"
- Possessives: "My wife is Jane" → "User's wife is named Jane"
- "I prefer X" → "User prefers X"
- "We're building X" → "User is building X"

Preserve specifics exactly:
- Technical terms: "Next.js 15", "gpt-oss-20b", "React 19"
- Version numbers: "TypeScript 5.3"
- Project names: "blah.chat"
- Code snippets: \`const\` vs \`let\`

For quotes, attribute to user:
- "I say 'X'" → "User's motto: 'X'"

Resolve pronouns intelligently:
- "My colleague John" → "User's colleague John"
- If ambiguous, preserve user's phrasing in quotes

Let context guide rephrasing - prioritize clarity for AI consumption.

Return ONLY the rephrased content, no explanation or additional text.`,
        });

        // 4. Generate new embedding
        const embeddingResult = await embed({
          model: EMBEDDING_MODEL,
          value: result.object.content,
        });

        // 5. Update memory
        await ctx.runMutation(internal.memories.updateWithEmbedding, {
          id: memory._id,
          content: result.object.content,
          embedding: embeddingResult.embedding,
        });

        migrated++;
      } catch (error) {
        console.error(`Failed to migrate memory ${memory._id}:`, error);
        skipped++;
      }
    }

    return { migrated, skipped, total: memories.length };
  },
});

export const consolidateUserMemories = action({
  handler: async (
    ctx,
  ): Promise<{
    original: number;
    consolidated: number;
    deleted: number;
    created: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user: Doc<"users"> | null = await ctx.runQuery(
      internal.lib.helpers.getCurrentUser,
      {},
    );
    if (!user) throw new Error("User not found");

    // 1. Fetch all user memories
    const memories: Doc<"memories">[] = await ctx.runQuery(
      internal.lib.helpers.listAllMemories,
      { userId: user._id },
    );

    if (memories.length === 0) {
      return { original: 0, consolidated: 0, deleted: 0, created: 0 };
    }

    const originalCount = memories.length;
    let deletedCount = 0;
    let createdCount = 0;

    // Track processed memory IDs to avoid reprocessing
    const processedIds = new Set<string>();
    const clustersToProcess: Doc<"memories">[][] = [];

    // 2. Group memories by similarity using vector search
    for (const memory of memories) {
      if (processedIds.has(memory._id)) continue;

      // Find similar memories using vector search
      const similarMemories = await ctx.runAction(
        internal.memories.searchByEmbedding,
        {
          userId: memory.userId,
          embedding: memory.embedding,
          limit: 20,
        },
      );

      // Filter by similarity threshold (0.85) and exclude self
      // Phase 7: Use native vector search scores (no manual calculation)
      const cluster: Doc<"memories">[] = [memory];
      processedIds.add(memory._id);

      for (const similar of similarMemories) {
        if (similar._id === memory._id) continue;
        if (processedIds.has(similar._id)) continue;

        // Use score from native vector search (already calculated)
        if (similar._score >= 0.85) {
          cluster.push(similar);
          processedIds.add(similar._id);
        }
      }

      // Process all clusters (even single memories for rephrasing)
      clustersToProcess.push(cluster);
    }

    console.log(
      `Found ${clustersToProcess.length} memories/clusters to process (${processedIds.size} total)`,
    );

    // 3. For each cluster: LLM consolidation/rephrasing
    for (const cluster of clustersToProcess) {
      try {
        const isSingleMemory = cluster.length === 1;

        const result = await generateObject({
          model: getModel(MEMORY_PROCESSING_MODEL.id),
          schema: consolidatedMemoriesSchema,
          providerOptions: getGatewayOptions(
            MEMORY_PROCESSING_MODEL.id,
            undefined,
            ["memory-consolidation"],
          ),
          prompt: isSingleMemory
            ? `Rephrase this memory to third-person perspective for AI context injection.

Memory:
- ${cluster[0].content} (ID: ${cluster[0]._id})

REPHRASING RULES:
- Convert first-person to third-person: "I am X" → "User is X"
- Possessives: "My wife is Jane" → "User's wife is named Jane"
- "I prefer X" → "User prefers X"
- "We're building X" → "User is building X"

Preserve specifics exactly:
- Technical terms: "Next.js 1", "gpt-oss-20b", "React 19"
- Version numbers: "TypeScript 5.3"
- Project names: "blah.chat"
- Code snippets: \`const\` vs \`let\`

For quotes, attribute to user:
- "I say 'X'" → "User's motto: 'X'"

Resolve pronouns intelligently:
- "My colleague John" → "User's colleague John"
- If ambiguous, preserve user's phrasing in quotes

${
  cluster[0].metadata?.reasoning
    ? `Original reasoning (preserve exactly): "${cluster[0].metadata.reasoning}"`
    : `This memory has no existing reasoning. Generate a clear, specific 1-2 sentence explanation of why this fact matters for future interactions with the user. Focus on practical value - how will knowing this help you assist the user better?`
}

Return ONE memory with:
- content: rephrased text in third-person
- category: ${cluster[0].metadata?.category || "context"}
- importance: ${cluster[0].metadata?.importance || 7}
- sourceIds: ["${cluster[0]._id}"]
- operation: "keep"
- reasoning: ${cluster[0].metadata?.reasoning ? "the preserved original reasoning from above" : "your newly generated reasoning explaining why this fact is valuable"}`
            : `Consolidate these related memories into atomic, self-contained units.

Memories:
${cluster.map((m) => `- ${m.content} (ID: ${m._id})`).join("\n")}

Rules:
1. Each output memory = ONE thought/idea/fact
2. Remove exact duplicates (keep most complete)
3. Merge similar memories into unified statement
4. Preserve all unique information
5. Third-person format ("User is X", "User's Y")
6. Include context for clarity

Return array of atomic memories with:
- content: consolidated text
- category: identity|preference|project|context|relationship
- importance: 1-10
- sourceIds: [original memory IDs merged] (use IDs from above)
- operation: "merge"|"dedupe"|"keep"
- reasoning: For each consolidated memory, provide reasoning. If source memories have reasoning, combine them (e.g., "Combines: reason1; reason2"). If source memories lack reasoning, generate clear 1-2 sentence explanation of why this consolidated fact is valuable for future interactions.

IMPORTANT: sourceIds must contain the actual memory IDs shown above.

Source memories with reasoning status:
${cluster
  .map((m) => {
    if (m.metadata?.reasoning) {
      return `- [${m._id}]: HAS reasoning: "${m.metadata.reasoning}"`;
    } else {
      return `- [${m._id}]: NO reasoning - Content: "${m.content}" (generate reasoning explaining why this matters)`;
    }
  })
  .join("\n")}`,
        });

        // 4. Delete original memories in cluster
        for (const memory of cluster) {
          await ctx.runMutation(internal.memories.deleteInternal, {
            id: memory._id,
          });
          deletedCount++;
        }

        // 5. Create consolidated memories
        for (const consolidated of result.object.memories) {
          // Generate embedding for new content
          const embeddingResult = await embed({
            model: EMBEDDING_MODEL,
            value: consolidated.content,
          });

          // Calculate expiration: inherit longest expiration (or none if any is permanent)
          const expiresAt = cluster.reduce(
            (longest: number | undefined, m) => {
              if (!m.metadata?.expiresAt) return undefined; // Any permanent memory makes the consolidated one permanent
              if (!longest) return m.metadata.expiresAt;
              return Math.max(longest, m.metadata.expiresAt);
            },
            undefined as number | undefined,
          );

          // Collect all source message IDs from cluster
          const allSourceMessageIds = cluster.reduce((acc, mem) => {
            if (mem.sourceMessageId) acc.push(mem.sourceMessageId);
            if (mem.sourceMessageIds) acc.push(...mem.sourceMessageIds);
            return acc;
          }, [] as Id<"messages">[]);

          // Dedupe
          const uniqueIds = [...new Set(allSourceMessageIds)];

          // Insert new atomic memory
          await ctx.runMutation(internal.memories.create, {
            userId: cluster[0].userId,
            content: consolidated.content,
            embedding: embeddingResult.embedding,
            sourceMessageIds: uniqueIds.length > 0 ? uniqueIds : undefined,
            metadata: {
              category: consolidated.category,
              importance: consolidated.importance,
              reasoning: consolidated.reasoning,
              confidence: 0.95, // Consolidated = high confidence
              verifiedBy: "consolidated",
              version: 1,
              expiresAt,
              extractedAt: Date.now(),
              sourceConversationId: cluster[0].conversationId,
            },
          });

          createdCount++;
        }
      } catch (error) {
        console.error(`Failed to consolidate cluster:`, error);
        // Continue with other clusters
      }
    }

    const consolidatedCount = originalCount - deletedCount + createdCount;

    console.log(
      `Consolidation complete: ${originalCount} → ${consolidatedCount} memories (${deletedCount} deleted, ${createdCount} created)`,
    );

    return {
      original: originalCount,
      consolidated: consolidatedCount,
      deleted: deletedCount,
      created: createdCount,
    };
  },
});

// Internal mutation for deleting memories (used by consolidation)
export const deleteInternal = internalMutation({
  args: {
    id: v.id("memories"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * Create memory from selected text (text selection context menu)
 */
export const createMemoryFromSelection = action({
  args: {
    content: v.string(),
    sourceMessageId: v.optional(v.id("messages")),
    sourceConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    // Get current user via query
    const user: Doc<"users"> | null = await ctx.runQuery(
      internal.lib.helpers.getCurrentUser,
      {},
    );
    if (!user) throw new Error("User not found");

    // Generate embedding using Vercel AI SDK
    const { embedding } = await embed({
      model: EMBEDDING_MODEL,
      value: args.content,
    });

    // Store memory with proper metadata
    await ctx.runMutation(internal.memories.create, {
      userId: user._id,
      content: args.content,
      embedding: embedding,
      conversationId: args.sourceConversationId,
      metadata: {
        category: "user_profile", // Default, could make user-selectable
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

import { openai } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { embed, generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

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
      reasoning: z.string().min(10).max(300), // Required: Preserve/combine from sources
    }),
  ),
});

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

export const getMemoryById = internalQuery({
  args: { id: v.id("memories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
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
    // @ts-ignore - Convex type instantiation depth issue
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

    // 1. Fetch user's memories (listAll already handles user lookup + filtering)
    const memories: Doc<"memories">[] = await ctx.runQuery(
      // @ts-ignore - Convex type instantiation depth issue
      api.memories.listAll,
    );

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
          model: openrouter("x-ai/grok-4.1-fast"),
          schema: rephrasedMemorySchema,
          prompt: `Rephrase this memory to third-person perspective for AI context injection.

Original memory: "${memory.content}"

REPHRASING RULES:
- Convert first-person to third-person: "I am X" → "User is X"
- Possessives: "My wife is Jane" → "User's wife is named Jane"
- "I prefer X" → "User prefers X"
- "We're building X" → "User is building X"

Preserve specifics exactly:
- Technical terms: "Next.js 15", "gpt-4o", "React 19"
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
          model: openai.embedding("text-embedding-3-small"),
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

    // 1. Fetch all user memories
    // @ts-ignore - Convex type instantiation depth issue
    const memories: Doc<"memories">[] = await ctx.runQuery(
      api.memories.listAll,
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
      const cluster: Doc<"memories">[] = [memory];
      processedIds.add(memory._id);

      for (const similar of similarMemories) {
        if (similar._id === memory._id) continue;
        if (processedIds.has(similar._id)) continue;

        // Calculate cosine similarity
        const similarity = cosineSimilarity(
          memory.embedding,
          similar.embedding,
        );

        if (similarity >= 0.85) {
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
          model: openrouter("x-ai/grok-4.1-fast"),
          schema: consolidatedMemoriesSchema,
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
- Technical terms: "Next.js 15", "gpt-4o", "React 19"
- Version numbers: "TypeScript 5.3"
- Project names: "blah.chat"
- Code snippets: \`const\` vs \`let\`

For quotes, attribute to user:
- "I say 'X'" → "User's motto: 'X'"

Resolve pronouns intelligently:
- "My colleague John" → "User's colleague John"
- If ambiguous, preserve user's phrasing in quotes

Original reasoning: "${cluster[0].metadata?.reasoning || "Important context for future interactions"}"

Return ONE memory with:
- content: rephrased text in third-person
- category: ${cluster[0].metadata?.category || "context"}
- importance: ${cluster[0].metadata?.importance || 7}
- sourceIds: ["${cluster[0]._id}"]
- operation: "keep"
- reasoning: preserve the original reasoning exactly as shown above`
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
- reasoning: For merged memories, combine the reasoning from source memories (e.g., "Combines: reason1; reason2"). For dedupe/keep operations, preserve the most complete reasoning from sources.

IMPORTANT: sourceIds must contain the actual memory IDs shown above.

Source reasoning for reference:
${cluster.map((m) => `- [${m._id}]: "${m.metadata?.reasoning || "No reasoning"}"`).join("\n")}`,
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
            model: openai.embedding("text-embedding-3-small"),
            value: consolidated.content,
          });

          // Insert new atomic memory
          await ctx.runMutation(internal.memories.create, {
            userId: cluster[0].userId,
            content: consolidated.content,
            embedding: embeddingResult.embedding,
            metadata: {
              category: consolidated.category,
              importance: consolidated.importance,
              reasoning: consolidated.reasoning,
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

// Helper: Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Internal mutation for deleting memories (used by consolidation)
export const deleteInternal = internalMutation({
  args: {
    id: v.id("memories"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

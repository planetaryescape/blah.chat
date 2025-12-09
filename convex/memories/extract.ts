import { getModel } from "@/lib/ai/registry";
import { openai } from "@ai-sdk/openai";
import { embedMany, generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import { MEMORY_EXTRACTION_MODEL } from "../../src/lib/ai/operational-models";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalAction, internalQuery } from "../_generated/server";
import { buildMemoryExtractionPrompt } from "../lib/prompts/operational/memoryExtraction";

const EMBEDDING_MODEL = "text-embedding-3-small"; // OpenAI embedding model

// Constants for memory extraction quality control
const IMPORTANCE_THRESHOLD = 7; // Only save facts rated 7+
const MIN_CONFIDENCE = 0.7; // Only save facts with 70%+ confidence
const MIN_CONTENT_LENGTH = 10;
const MAX_CONTENT_LENGTH = 500;
const SIMILARITY_THRESHOLD = 0.85; // Cosine similarity threshold for duplicates

// TTL configuration (in milliseconds)
const EXPIRATION_MS = {
  contextual: 7 * 24 * 60 * 60 * 1000, // 7 days
  preference: null, // Never expires
  deadline: null, // TODO: parse from fact content
  temporary: 1 * 24 * 60 * 60 * 1000, // 1 day
} as const;

const memorySchema = z.object({
  facts: z.array(
    z.object({
      content: z.string().min(10).max(500), // Enforce length bounds
      category: z.enum([
        "identity",
        "preference",
        "project",
        "context",
        "relationship",
      ]),
      importance: z.number().min(1).max(10), // Required: 1-10 scale
      reasoning: z.string().min(10).max(300), // Required: 1-2 sentences explaining importance
      confidence: z.number().min(0).max(1), // NEW: 0.0-1.0 confidence score
      expirationHint: z
        .enum(["contextual", "preference", "deadline", "temporary"])
        .optional(), // NEW: TTL hint
    }),
  ),
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

// Helper: Check if memory is duplicate using semantic similarity
async function isMemoryDuplicate(
  ctx: any,
  userId: string,
  newContent: string,
  newEmbedding: number[],
): Promise<boolean> {
  try {
    // Query vector index for similar memories
    const similarMemories = await ctx.vectorSearch("memories", "by_embedding", {
      vector: newEmbedding,
      filter: (q: any) => q.eq("userId", userId),
      limit: 5, // Check top 5 most similar
    });

    // Calculate cosine similarity for each
    for (const memory of similarMemories) {
      // Skip memories without embeddings or mismatched dimensions
      if (
        !memory.embedding ||
        memory.embedding.length !== newEmbedding.length
      ) {
        continue;
      }

      const similarity = cosineSimilarity(newEmbedding, memory.embedding);
      if (similarity > SIMILARITY_THRESHOLD) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking duplicate:", error);
    return false; // Don't block on error
  }
}

export const extractMemories = internalAction({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args): Promise<{ extracted: number }> => {
    // 1. Get conversation with cursor
    const conversation = await ctx.runQuery(
      // @ts-ignore - Convex query type instantiation depth issue
      internal.conversations.getInternal,
      {
        id: args.conversationId,
      },
    );

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // 2. Query unextracted messages after cursor
    const unextractedMessages = (await ctx.runQuery(
      internal.messages.listUnextracted,
      {
        conversationId: args.conversationId,
        afterMessageId: conversation.lastExtractedMessageId,
        limit: 20, // Process up to 20 new messages
      },
    )) as Doc<"messages">[];

    const markAsProcessed = async () => {
      if (unextractedMessages.length === 0) return;
      await ctx.runMutation(internal.messages.markExtracted, {
        messageIds: unextractedMessages.map((m) => m._id),
        extractedAt: Date.now(),
      });
      await ctx.runMutation(internal.conversations.updateExtractionCursor, {
        id: args.conversationId,
        lastExtractedMessageId:
          unextractedMessages[unextractedMessages.length - 1]._id,
        lastMemoryExtractionAt: Date.now(),
      });
    };

    // 3. Skip if single message with very low content (likely "thanks" / "ok")
    if (unextractedMessages.length === 1) {
      const content = unextractedMessages[0].content || "";
      if (content.length < 20) {
        // ~5 words
        await markAsProcessed();
        return { extracted: 0 };
      }
    }

    // 4. Token-aware skip (lower threshold for short sessions)
    const totalContent = unextractedMessages
      .map((m) => m.content || "")
      .join(" ");
    const estimatedTokens = totalContent.length / 4; // rough estimate
    if (estimatedTokens < 100) {
      // Lowered from 500
      await markAsProcessed();
      return { extracted: 0 };
    }

    // 5. Include previous 5 extracted messages for context continuity
    let contextMessages: Doc<"messages">[] = [];
    if (unextractedMessages.length > 0) {
      contextMessages = (await ctx.runQuery(internal.messages.listExtracted, {
        conversationId: args.conversationId,
        beforeMessageId: unextractedMessages[0]._id,
        limit: 5,
      })) as Doc<"messages">[];
    }

    // 6. Build extraction context (5 old + N new)
    const extractionWindow = [...contextMessages, ...unextractedMessages];

    // 7. Extract facts
    const conversationText: string = extractionWindow
      .map((m: Doc<"messages">) => `${m.role}: ${m.content || ""}`)
      .join("\n\n");

    // 8. Get existing memories for context
    const existingMemories = await ctx.runQuery(
      internal.memories.internalList,
      {
        userId: conversation.userId,
        limit: 50, // Context window limit
      },
    );

    const existingMemoriesText = existingMemories
      .map((m: any) => `- ${m.content} (${m.metadata?.category || "general"})`)
      .join("\n");

    try {
      const result = await generateObject({
        model: getModel(MEMORY_EXTRACTION_MODEL.id),
        schema: memorySchema,
        providerOptions: getGatewayOptions(
          MEMORY_EXTRACTION_MODEL.id,
          undefined,
          ["memory-extraction"],
        ),
        prompt: buildMemoryExtractionPrompt(
          existingMemoriesText,
          conversationText,
        ),
      });

      if (result.object.facts.length === 0) {
        await markAsProcessed();
        return { extracted: 0 };
      }

      // 3. Filter by importance and confidence thresholds
      const qualityFacts = result.object.facts.filter(
        (f) =>
          f.importance >= IMPORTANCE_THRESHOLD &&
          f.confidence >= MIN_CONFIDENCE,
      );

      if (qualityFacts.length === 0) {
        await markAsProcessed();
        return { extracted: 0 };
      }

      // 4. Generate embeddings (batch)
      const embeddingResult = await embedMany({
        model: openai.embedding(EMBEDDING_MODEL),
        values: qualityFacts.map((f) => f.content),
      });

      // 5. Semantic deduplication check and store unique memories
      let storedCount = 0;
      const extractedAt = Date.now();

      for (let i = 0; i < qualityFacts.length; i++) {
        const fact = qualityFacts[i];
        const embedding = embeddingResult.embeddings[i];

        // Calculate expiration timestamp
        const expirationMs = fact.expirationHint
          ? EXPIRATION_MS[fact.expirationHint]
          : null;
        const expiresAt = expirationMs ? extractedAt + expirationMs : undefined;

        // Check if duplicate
        const isDuplicate = await isMemoryDuplicate(
          ctx,
          conversation.userId,
          fact.content,
          embedding,
        );

        if (isDuplicate) {
          continue;
        }

        // Store unique memory with all metadata
        await ctx.runMutation(internal.memories.create, {
          userId: conversation.userId,
          content: fact.content,
          embedding: embedding,
          conversationId: args.conversationId,
          sourceMessageIds: unextractedMessages.map((m) => m._id),
          metadata: {
            category: fact.category,
            importance: fact.importance,
            reasoning: fact.reasoning,
            confidence: fact.confidence,
            verifiedBy: "auto",
            expiresAt,
            expirationHint: fact.expirationHint,
            version: 1,
            extractedAt: extractedAt,
            sourceConversationId: args.conversationId,
          },
        });

        storedCount++;
      }

      console.log(
        `Extracted ${storedCount} unique memories (${qualityFacts.length - storedCount} duplicates filtered)`,
      );

      // 6. Update conversation tracking
      await ctx.runMutation(internal.conversations.updateMemoryTracking, {
        id: args.conversationId,
        lastMemoryExtractionAt: Date.now(),
      });

      // 7. Invalidate memory cache when new memories extracted
      await ctx.runMutation(internal.conversations.clearMemoryCache, {
        conversationId: args.conversationId,
      });

      // 8. Mark messages as extracted
      await markAsProcessed();

      return { extracted: storedCount };
    } catch (error) {
      console.error("Memory extraction failed:", error);
      return { extracted: 0 };
    }
  },
});

export const processInactiveConversations = internalAction({
  handler: async (ctx) => {
    const now = Date.now();
    const INACTIVITY_THRESHOLD = 15 * 60 * 1000; // 15 minutes
    const STALE_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days
    const BATCH_SIZE = 50;

    // 1. Find conversations with unextracted messages that are inactive
    const candidates = await ctx.runQuery(
      internal.memories.extract.findInactiveConversations,
      {
        inactivityThreshold: now - INACTIVITY_THRESHOLD,
        staleThreshold: now - STALE_THRESHOLD,
        batchSize: BATCH_SIZE,
      },
    );

    if (candidates.length === 0) {
      return { processed: 0 };
    }

    console.log(
      `[Cron] Found ${candidates.length} inactive conversations to process`,
    );

    // 2. Schedule extraction for each (async, don't block cron)
    let scheduled = 0;
    for (const conv of candidates) {
      await ctx.scheduler.runAfter(
        0,
        internal.memories.extract.extractMemories,
        {
          conversationId: conv._id,
        },
      );
      scheduled++;
    }

    console.log(`[Cron] Scheduled ${scheduled} extractions`);
    return { processed: scheduled };
  },
});

export const findInactiveConversations = internalQuery({
  args: {
    inactivityThreshold: v.number(), // Timestamp: conversations BEFORE this are inactive
    staleThreshold: v.number(), // Timestamp: conversations BEFORE this are too old
    batchSize: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all conversations (will filter in-memory)
    // Note: Convex doesn't have composite index on (userId, lastMessageAt)
    // so we fetch all and filter
    const allConversations = await ctx.db.query("conversations").collect();

    const candidates: Array<{
      _id: Id<"conversations">;
      lastMessageAt: number;
    }> = [];

    for (const conv of allConversations) {
      // Filter 1: Must be inactive (last message >15min ago)
      if (conv.lastMessageAt > args.inactivityThreshold) {
        continue; // Still active
      }

      // Filter 2: Must not be stale (last message <7 days ago)
      if (conv.lastMessageAt < args.staleThreshold) {
        continue; // Too old
      }

      // Filter 3: Must have unextracted messages
      const unextractedCount = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .filter((q) =>
          q.or(
            q.eq(q.field("memoryExtracted"), false),
            q.eq(q.field("memoryExtracted"), undefined),
          ),
        )
        .collect()
        .then((msgs) => msgs.length);

      if (unextractedCount === 0) {
        continue; // All messages already extracted
      }

      // Filter 4: Must have at least 2 messages total (avoid trivial convos)
      const totalMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect()
        .then((msgs) => msgs.length);

      if (totalMessages < 2) {
        continue; // Single-message conversation (not useful)
      }

      candidates.push({
        _id: conv._id,
        lastMessageAt: conv.lastMessageAt,
      });

      // Stop at batch size
      if (candidates.length >= args.batchSize) {
        break;
      }
    }

    // Sort by lastMessageAt (oldest inactive first = highest priority)
    candidates.sort((a, b) => a.lastMessageAt - b.lastMessageAt);

    return candidates;
  },
});

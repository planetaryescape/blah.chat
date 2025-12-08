import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import { embedMany, generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalAction, internalQuery } from "../_generated/server";

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
      // @ts-ignore - Type instantiation depth issue with internal mutations
      internal.conversations.getInternal,
      {
        id: args.conversationId,
      },
    );

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // 2. Query unextracted messages after cursor
    // @ts-ignore
    const unextractedMessages = (await ctx.runQuery(
      internal.messages.listUnextracted,
      {
        conversationId: args.conversationId,
        afterMessageId: conversation.lastExtractedMessageId,
        limit: 20, // Process up to 20 new messages
      },
    )) as Doc<"messages">[];

    // 3. Skip if single message with very low content (likely "thanks" / "ok")
    if (unextractedMessages.length === 1) {
      const content = unextractedMessages[0].content || "";
      if (content.length < 20) {
        // ~5 words
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
      return { extracted: 0 };
    }

    // 5. Include previous 5 extracted messages for context continuity
    let contextMessages: Doc<"messages">[] = [];
    if (unextractedMessages.length > 0) {
      // @ts-ignore
      contextMessages = (await ctx.runQuery(internal.messages.listExtracted, {
        conversationId: args.conversationId,
        beforeMessageId: unextractedMessages[0]._id,
        limit: 5,
      })) as Doc<"messages">[];
    }

    // 6. Build extraction context (5 old + N new)
    const extractionWindow = [...contextMessages, ...unextractedMessages];

    // 7. Extract facts with grok-4.1-fast via OpenRouter
    const conversationText: string = extractionWindow
      .map((m: Doc<"messages">) => `${m.role}: ${m.content || ""}`)
      .join("\n\n");

    console.log(
      `[Extraction] Processing ${unextractedMessages.length} new messages (${contextMessages.length} context)`,
    );

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
        model: groq("openai/gpt-oss-120b"),
        schema: memorySchema,
        prompt: `You are a CONSERVATIVE memory system. Extract ONLY facts that pass all these tests:

1. **Usefulness test**: Would this fact be useful 6+ months from now?
2. **Persistence test**: Is this a lasting trait/preference, not a one-off interaction?
3. **Explicitness test**: Is this explicitly stated or repeatedly demonstrated?

✅ CAPTURE ONLY:
- Core identity: name, occupation, location, background
- Lasting preferences: "I prefer X", "I always Y", "I never Z"
- Active projects: concrete details, tech stacks, goals
- Important relationships: team members, collaborators with context
- Significant life context: major goals, challenges, commitments

🔄 REPHRASING RULES:
Convert all facts to third-person perspective for AI context injection:
- "I am X" → "User is X"
- "My wife is Jane" → "User's wife is named Jane"
- "I prefer TypeScript" → "User prefers TypeScript"
- "We're building a startup" → "User is building a startup"

Preserve specifics:
- Technical terms exactly: "Next.js 15", "gpt-4o", "React 19"
- Version numbers: "TypeScript 5.3"
- Project names: "blah.chat"
- Quotes with attribution: "User mentioned: 'exact quote here'"

Resolve pronouns intelligently:
- "My colleague John" → "User's colleague John"
- "She recommended X" → "[Name] recommended X" (or use context to clarify)
- If ambiguous, preserve user's phrasing in quotes

Let context guide rephrasing - prioritize clarity for AI consumption.

❌ DO NOT CAPTURE:
- One-off requests: "can you write a poem about X", "show me Y"
- Questions out of curiosity: "what are the top Z"
- Playful banter: casual jokes, random messages, test inputs
- Temporary interests: single mentions without confirmation
- Generic statements: facts without specific, personal details
- Exploration: trying features, asking how things work

IMPORTANCE SCORING (1-10):
Rate each fact honestly:
- 9-10: Critical identity (name, role, core values)
- 7-8: Confirmed lasting preferences, active projects with details
- 5-6: Useful context, relationships (DO NOT SAVE - below threshold)
- 1-4: Ephemeral/generic (DO NOT SAVE)

⚠️ ONLY return facts with importance >= 7. If nothing meets this bar, return empty array.

CONFIDENCE SCORING (0.0-1.0):
Rate certainty about this fact:
- 0.9-1.0: Explicit statement, direct quote ("I am X", "My name is Y")
- 0.7-0.9: Strong contextual evidence, repeated mentions
- 0.5-0.7: Weak inference, single mention
- Below 0.5: Speculation (DO NOT EXTRACT)

Examples:
- "I am a software engineer" → confidence: 1.0
- "I prefer TypeScript over JavaScript" → confidence: 0.9
- "I'm thinking about trying Rust" → confidence: 0.5 (don't extract)

ONLY extract facts with confidence >= 0.7

TEMPORAL CONTEXT (Expiration Hints):
For time-sensitive facts, suggest expiration:
- "contextual": Conversation-specific info (expires in 7 days)
- "preference": User preferences (never expires)
- "deadline": Time-bound tasks (completion + 7 days)
- "temporary": One-time context (expires in 1 day)
- "none": General knowledge (never expires)

Examples:
- "User is building v1.0" → "deadline"
- "Deadline: Dec 2024" → "deadline"
- "User prefers dark mode" → "preference"
- "User mentioned TypeScript today" → "contextual"

EXISTING MEMORIES (Do NOT duplicate):
${existingMemoriesText}

Conversation:
${conversationText}

Return JSON with facts that pass ALL tests above. REQUIRED: Include importance (7-10 only), reasoning (1-2 sentences explaining why this fact matters long-term), confidence (0.7-1.0), and expirationHint if applicable.`,
      });

      if (result.object.facts.length === 0) {
        return { extracted: 0 };
      }

      // 3. Filter by importance and confidence thresholds
      const qualityFacts = result.object.facts.filter(
        (f) =>
          f.importance >= IMPORTANCE_THRESHOLD &&
          f.confidence >= MIN_CONFIDENCE,
      );

      if (qualityFacts.length === 0) {
        return { extracted: 0 };
      }

      // 4. Generate embeddings (batch)
      const embeddingResult = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
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
      await ctx.runMutation(internal.messages.markExtracted, {
        messageIds: unextractedMessages.map((m) => m._id),
        extractedAt: Date.now(),
      });

      // 9. Update conversation cursor
      await ctx.runMutation(internal.conversations.updateExtractionCursor, {
        id: args.conversationId,
        lastExtractedMessageId:
          unextractedMessages[unextractedMessages.length - 1]._id,
        lastMemoryExtractionAt: Date.now(),
      });

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

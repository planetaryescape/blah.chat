import { openai } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { embedMany, generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

// Constants for memory extraction quality control
const IMPORTANCE_THRESHOLD = 7; // Only save facts rated 7+
const MIN_CONTENT_LENGTH = 10;
const MAX_CONTENT_LENGTH = 500;
const SIMILARITY_THRESHOLD = 0.85; // Cosine similarity threshold for duplicates

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
      reasoning: z.string().optional(), // Why this is important
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
      const similarity = cosineSimilarity(newEmbedding, memory.embedding);
      if (similarity > SIMILARITY_THRESHOLD) {
        console.log(
          `Duplicate detected: "${newContent}" similar to "${memory.content}" (similarity: ${similarity.toFixed(3)})`,
        );
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
    // 1. Fetch recent messages (last 10)
    // @ts-ignore
    const allMessages = (await ctx.runQuery(internal.messages.listInternal, {
      conversationId: args.conversationId,
    })) as Doc<"messages">[];

    if (allMessages.length === 0) {
      return { extracted: 0 };
    }

    const recentMessages = allMessages.slice(-10);

    // 2. Extract facts with grok-2-1212 via OpenRouter
    const conversationText: string = recentMessages
      .map((m: Doc<"messages">) => `${m.role}: ${m.content || ""}`)
      .join("\n\n");

    // 4. Get conversation to retrieve userId
    const conversation = await ctx.runQuery(
      internal.conversations.getInternal,
      {
        id: args.conversationId,
      },
    );

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // 5. Get existing memories for context
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
        model: openrouter("x-ai/grok-4.1-fast"),
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

EXISTING MEMORIES (Do NOT duplicate):
${existingMemoriesText}

Conversation:
${conversationText}

Return JSON with facts that pass ALL tests above. Include importance (7-10 only) and reasoning (why important).`,
      });

      if (result.object.facts.length === 0) {
        return { extracted: 0 };
      }

      // 3. Filter by importance threshold (should already be filtered by LLM, but double-check)
      const importantFacts = result.object.facts.filter(
        (f) => f.importance >= IMPORTANCE_THRESHOLD,
      );

      if (importantFacts.length === 0) {
        console.log("No facts met importance threshold after LLM extraction");
        return { extracted: 0 };
      }

      // 4. Generate embeddings (batch)
      const embeddingResult = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values: importantFacts.map((f) => f.content),
      });

      // 5. Semantic deduplication check and store unique memories
      let storedCount = 0;
      const extractedAt = Date.now();

      for (let i = 0; i < importantFacts.length; i++) {
        const fact = importantFacts[i];
        const embedding = embeddingResult.embeddings[i];

        // Check if duplicate
        const isDuplicate = await isMemoryDuplicate(
          ctx,
          conversation.userId,
          fact.content,
          embedding,
        );

        if (isDuplicate) {
          console.log(`Skipping duplicate memory: "${fact.content}"`);
          continue;
        }

        // Store unique memory with all metadata
        await ctx.runMutation(internal.memories.create, {
          userId: conversation.userId,
          content: fact.content,
          embedding: embedding,
          conversationId: args.conversationId,
          metadata: {
            category: fact.category,
            importance: fact.importance,
            reasoning: fact.reasoning,
            extractedAt: extractedAt,
            sourceConversationId: args.conversationId,
          },
        });

        storedCount++;
      }

      console.log(
        `Extracted ${storedCount} unique memories (${importantFacts.length - storedCount} duplicates filtered)`,
      );

      // 6. Update conversation tracking
      await ctx.runMutation(internal.conversations.updateMemoryTracking, {
        id: args.conversationId,
        lastMemoryExtractionAt: Date.now(),
      });

      return { extracted: storedCount };
    } catch (error) {
      console.error("Memory extraction failed:", error);
      return { extracted: 0 };
    }
  },
});

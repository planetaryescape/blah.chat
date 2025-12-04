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

const memorySchema = z.object({
  facts: z.array(
    z.object({
      content: z.string(),
      category: z.enum([
        "identity",
        "preference",
        "project",
        "context",
        "relationship",
      ]),
    }),
  ),
});

export const extractMemories = internalAction({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args): Promise<{ extracted: number }> => {
    // 1. Fetch recent messages (last 10)
    const allMessages: Doc<"messages">[] = await ctx.runQuery(
      internal.messages.listInternal,
      {
        conversationId: args.conversationId,
      },
    );

    if (allMessages.length === 0) {
      return { extracted: 0 };
    }

    const recentMessages = allMessages.slice(-10);

    // 2. Extract facts with grok-2-1212 via OpenRouter
    const conversationText: string = recentMessages
      .map((m: Doc<"messages">) => `${m.role}: ${m.content || ""}`)
      .join("\n\n");

    try {
      const result = await generateObject({
        model: openrouter("x-ai/grok-4.1-fast"),
        schema: memorySchema,
        prompt: `Extract memorable facts from this conversation. Focus on:
- User identity (name, occupation, background)
- Preferences (likes, dislikes, style)
- Project details (what they're building, tech stack)
- Context (goals, challenges, relationships)
- Relationships (team members, collaborators)

Return ONLY facts worth remembering long-term. Skip generic statements.

Conversation:
${conversationText}`,
      });

      if (result.object.facts.length === 0) {
        return { extracted: 0 };
      }

      // 3. Generate embeddings (batch)
      const embeddingResult = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values: result.object.facts.map((f) => f.content),
      });

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

      // 5. Store memories
      for (let i = 0; i < result.object.facts.length; i++) {
        await ctx.runMutation(internal.memories.create, {
          userId: conversation.userId,
          content: result.object.facts[i].content,
          embedding: embeddingResult.embeddings[i],
          conversationId: args.conversationId,
          category: result.object.facts[i].category,
        });
      }

      // 6. Update conversation tracking
      await ctx.runMutation(internal.conversations.updateMemoryTracking, {
        id: args.conversationId,
        lastMemoryExtractionAt: Date.now(),
      });

      return { extracted: result.object.facts.length };
    } catch (error) {
      console.error("Memory extraction failed:", error);
      return { extracted: 0 };
    }
  },
});

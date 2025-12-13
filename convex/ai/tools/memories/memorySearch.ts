import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";

/**
 * Create memory search tool with closure over ActionCtx.
 * MUST be called inside action handler to capture ctx.
 */
export function createMemorySearchTool(ctx: ActionCtx, userId: Id<"users">) {
  return tool({
    description: `Retrieve past conversation facts and context from memory bank.

CALL THIS TOOL when user asks about THEIR OWN:
- Skills, knowledge, or experience: "Do I know X?", "Have I used Y?"
- Preferences or opinions: "What do I like?", "How do I feel about Z?"
- Past discussions: "What did I say about...", "the project I mentioned"
- Specific facts/events: "When did I...", "What was the result of..."
- Project/goal details: "What are the specs for...", "How did we decide to..."

DO NOT call for:
- User's basic identity (name, nickname) — pre-loaded in system prompt
- WORLD knowledge unrelated to user: "What is Python?" (not "Do I know Python?")
- Greetings, confirmations, simple chit-chat
- Information already visible in pre-loaded identity section of system prompt

Multi-turn usage: You can call this tool multiple times to refine/clarify results if needed.

Categories: fact=events/decisions, context=discussions, goal=objectives, project=work details.
Preference/identity/relationship memories are pre-loaded.`,
    inputSchema: z.object({
      query: z.string().describe("Search query (keywords or semantic meaning)"),
      category: z
        .enum(["preference", "fact", "relationship", "goal", "context"])
        .optional()
        .describe("Memory category to filter by"),
      limit: z.number().optional().default(5).describe("Max results to return"),
    }),
    execute: async (input) => {
      const { query, category, limit = 5 } = input;
      try {
        const memories = await ctx.runAction(
          internal.memories.search.hybridSearch,
          {
            userId,
            query,
            limit,
            category,
          },
        );

        if (memories.length === 0) {
          return { found: 0, memories: [] };
        }

        return {
          found: memories.length,
          // biome-ignore lint/suspicious/noExplicitAny: Complex memory object types
          memories: memories.map((m: any) => ({
            content: m.content,
            category: m.metadata?.category || "context",
            importance: m.metadata?.importance || 0,
          })),
        };
      } catch (error) {
        console.error("[Tool] Memory search failed:", error);
        // Return empty results for graceful degradation
        return {
          found: 0,
          memories: [],
        };
      }
    },
  });
}

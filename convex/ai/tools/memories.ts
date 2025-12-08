import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

/**
 * Create memory search tool with closure over ActionCtx.
 * MUST be called inside action handler to capture ctx.
 */
export function createMemorySearchTool(ctx: ActionCtx, userId: Id<"users">) {
  return tool({
    description: `Retrieve past conversation facts and context from memory bank. Call when user asks about:
- Past discussions: "What did I say about X?", "the project I mentioned"
- Specific facts/events: "When did I...", "What was the result of..."
- Project/goal details: "What are the specs for...", "How did we decide to..."

DO NOT call for:
- User's identity, name, preferences, relationships (already provided in system prompt)
- General knowledge questions (use your training)
- Greetings, confirmations, simple chit-chat

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
    // @ts-ignore - Convex internal API + AI SDK type inference causes "excessively deep" errors
    execute: async (input) => {
      const { query, category, limit = 5 } = input;
      try {
        const memories = await ctx.runAction(
          // @ts-ignore - Convex type instantiation depth issue
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

/**
 * Create memory save tool with closure over ActionCtx.
 * MUST be called inside action handler to capture ctx.
 */
export function createMemorySaveTool(ctx: ActionCtx, userId: Id<"users">) {
  return tool({
    description: `Save important information about the user to memory for future reference. Use when:

✅ CALL THIS TOOL WHEN:
- User explicitly asks: "remember this", "save this", "don't forget that I...", "keep in mind that..."
- User shares critical identity info: name, role, job title, location, family members
- User states clear preferences: "I prefer X", "I always Y", "I never Z"
- User mentions ongoing projects with specific details
- User shares important relationships: team members, collaborators with context

❌ DO NOT CALL THIS TOOL FOR:
- Temporary context or one-off requests ("can you write a poem about X")
- Information already known (check system prompt first)
- Vague or uncertain statements ("I might try X someday")
- Questions or curiosity without stated preference
- Generic facts without personal relevance

IMPORTANT: Rephrase content to third-person before saving:
- "I am X" → "User is X"
- "My wife is Jane" → "User's wife is named Jane"
- "I prefer TypeScript" → "User prefers TypeScript"`,
    inputSchema: z.object({
      content: z
        .string()
        .min(10)
        .max(500)
        .describe(
          "The fact to remember, rephrased in third person (e.g., 'User prefers dark mode')",
        ),
      category: z
        .enum(["identity", "preference", "project", "context", "relationship"])
        .describe(
          "Category: identity=who they are, preference=likes/dislikes, project=work details, context=situational info, relationship=people they know",
        ),
      reasoning: z
        .string()
        .min(10)
        .max(200)
        .describe(
          "Brief explanation of why this is worth remembering long-term (1-2 sentences)",
        ),
    }),
    // @ts-ignore - Convex internal API + AI SDK type inference causes "excessively deep" errors
    execute: async (input) => {
      const { content, category, reasoning } = input;
      try {
        const result = await ctx.runAction(
          // @ts-ignore - Convex type instantiation depth issue
          internal.memories.save.saveFromTool,
          {
            userId,
            content,
            category,
            reasoning,
          },
        );

        return result;
      } catch (error) {
        console.error("[Tool] Memory save failed:", error);
        return {
          success: false,
          message: `Failed to save memory: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });
}


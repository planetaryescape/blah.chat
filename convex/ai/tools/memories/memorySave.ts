import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";

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
    execute: async (input) => {
      const { content, category, reasoning } = input;
      try {
        const result = await ctx.runAction(
          // @ts-expect-error - Convex type instantiation depth issue
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

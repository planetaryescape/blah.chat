import { tool } from "ai";
import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";

/**
 * Create memory search tool with closure over ActionCtx.
 * MUST be called inside action handler to capture ctx.
 */
export function createMemorySearchTool(ctx: ActionCtx, userId: Id<"users">) {
  return tool({
    description:
      "Search user's memory bank for relevant context. Use when user references past conversations, preferences, or specific details not in current context.",
    parameters: {
      $schema: "http://json-schema.org/draft-07/schema#" as const,
      type: "object" as const,
      properties: {
        query: {
          type: "string" as const,
          description: "Search query (keywords or semantic meaning)",
        },
        category: {
          type: "string" as const,
          enum: ["preference", "fact", "relationship", "goal", "context"] as const,
          description: "Memory category to filter by",
        },
        limit: {
          type: "number" as const,
          description: "Max results to return",
          default: 5,
        },
      },
      required: ["query"] as const,
      additionalProperties: false as const,
    },
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
          return JSON.stringify({ found: 0, memories: [] });
        }

        return JSON.stringify({
          found: memories.length,
          memories: memories.map((m: any) => ({
            content: m.content,
            category: m.metadata?.category || "context",
            importance: m.metadata?.importance || 0,
          })),
        });
      } catch (error) {
        console.error("[Tool] Memory search failed:", error);
        return JSON.stringify({
          found: 0,
          memories: [],
          error: "Failed to search memories",
        });
      }
    },
  });
}

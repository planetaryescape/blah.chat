import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";

/**
 * Web Search tool using Tavily API.
 * Requires TAVILY_API_KEY environment variable.
 */
export function createWebSearchTool(ctx: ActionCtx) {
  return tool({
    description: `Search the web for current information.

✅ USE FOR:
- Current events and news
- Real-time data (prices, weather, stock quotes)
- Recent documentation or release notes
- Fact-checking claims
- Research on current topics

❌ DO NOT USE FOR:
- Information you already know from training
- User's personal preferences (use memory tool instead)
- Historical facts you're confident about
- Code generation tasks

Returns top results with titles, URLs, and content snippets.`,

    inputSchema: z.object({
      query: z.string().describe("Search query"),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Number of results to return (1-10)"),
    }),

    execute: async ({ query, maxResults = 5 }) => {
      try {
        const result = await ctx.runAction(
          internal.tools.webSearch.search,
          {
            query,
            maxResults: Math.min(maxResults, 10),
          },
        );

        return result;
      } catch (error) {
        console.error("[Tool] Web search failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Web search failed",
        };
      }
    },
  });
}

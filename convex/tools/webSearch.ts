import { v } from "convex/values";
import { internalAction } from "../_generated/server";

/**
 * Backend action for web search using Tavily API.
 * Called by the webSearch tool.
 */
export const search = internalAction({
  args: {
    query: v.string(),
    maxResults: v.number(),
  },
  handler: async (ctx, { query, maxResults }) => {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      console.warn("[WebSearch] TAVILY_API_KEY not configured");
      return {
        success: false,
        error:
          "Web search is not configured. Please add TAVILY_API_KEY to environment variables.",
      };
    }

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: maxResults,
          search_depth: "basic",
          include_answer: true,
          include_images: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[WebSearch] API error:", response.status, errorText);
        return {
          success: false,
          error: `Search failed: ${response.statusText}`,
        };
      }

      const data = await response.json();

      console.log(
        `[WebSearch] Found ${data.results?.length || 0} results for: "${query}"`,
      );

      return {
        success: true,
        query,
        answer: data.answer || null,
        results: (data.results || []).map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score,
        })),
      };
    } catch (error) {
      console.error("[WebSearch] Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Web search failed",
      };
    }
  },
});

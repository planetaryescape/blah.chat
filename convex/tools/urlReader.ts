import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export const readUrl = internalAction({
  args: {
    url: v.string(),
    maxLength: v.optional(v.number()),
    format: v.optional(v.union(v.literal("markdown"), v.literal("text"))),
  },
  handler: async (ctx, { url, maxLength = 5000, format = "markdown" }) => {
    try {
      // Use Jina AI Reader API
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;

      const headers: Record<string, string> = {
        "X-Return-Format": format,
      };

      // Optional: Add API key if configured for higher rate limits
      if (process.env.JINA_API_KEY) {
        headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
      }

      const response = await fetch(jinaUrl, { headers });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch URL: ${response.status} ${response.statusText}`,
        );
      }

      const content = await response.text();
      const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;

      // Truncate if needed
      const truncated = content.slice(0, maxLength);
      const isTruncated = content.length > maxLength;

      return {
        success: true,
        url,
        content: truncated,
        wordCount,
        truncated: isTruncated,
      };
    } catch (error) {
      return {
        success: false,
        url,
        error:
          error instanceof Error ? error.message : "Failed to read URL content",
      };
    }
  },
});

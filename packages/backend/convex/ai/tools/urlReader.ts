import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";

export function createUrlReaderTool(ctx: ActionCtx) {
  return tool({
    description: `Read and extract content from web pages.

✅ USE FOR:
- Documentation, articles, blog posts
- Web pages, news articles
- Any non-video URL content

⚠️ FOR YOUTUBE LINKS: Use the youtubeVideo tool instead - it can analyze the actual video content, not just the page text.

Returns clean markdown or text content.`,
    inputSchema: z.object({
      url: z
        .string()
        .url()
        .describe("The URL to read and extract content from"),
      maxLength: z
        .number()
        .optional()
        .describe(
          "Maximum characters to return (default: 5000). Useful to limit context size.",
        ),
      format: z
        .enum(["markdown", "text"])
        .optional()
        .describe(
          "Output format (default: markdown). Markdown preserves structure, text is plain.",
        ),
    }),
    execute: async ({ url, maxLength, format }) => {
      const result = (await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.tools.urlReader.readUrl,
        {
          url,
          maxLength,
          format,
        },
      )) as { content: string; title?: string; error?: string };

      return result;
    },
  });
}

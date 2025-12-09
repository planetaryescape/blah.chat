import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";

export function createUrlReaderTool(ctx: ActionCtx) {
	return tool({
		description:
			"Read and extract content from any URL. Returns clean markdown or text content from web pages, documentation, articles, and more. Useful for reading documentation, articles, or any web content.",
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
			const result = await ctx.runAction(internal.tools.urlReader.readUrl, {
				url,
				maxLength,
				format,
			});

			return result;
		},
	});
}

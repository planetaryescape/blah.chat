import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

/**
 * Enriches source citations with OpenGraph metadata
 * Runs asynchronously after message completion to avoid blocking
 */
export const enrichSourceMetadata = internalAction({
  args: {
    messageId: v.id("messages"),
    sources: v.array(
      v.object({
        id: v.string(),
        url: v.string(),
      }),
    ),
  },
  handler: async (ctx, { messageId, sources }) => {
    // Fetch OpenGraph metadata for each source in parallel
    const metadata: Array<{
      sourceId: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImage?: string;
      favicon?: string;
      domain: string;
      fetchedAt?: number;
      error?: string;
    }> = await Promise.all(
      sources.map(async (source) => {
        try {
          const domain = new URL(source.url).hostname;

          // Fetch OpenGraph data
          const ogData = await fetchOpenGraph(source.url);

          return {
            sourceId: source.id,
            ogTitle: ogData.title,
            ogDescription: ogData.description,
            ogImage: ogData.image,
            favicon:
              ogData.favicon ||
              `https://www.google.com/s2/favicons?domain=${domain}`,
            domain,
            fetchedAt: Date.now(),
          };
          // biome-ignore lint/suspicious/noExplicitAny: Error object types
        } catch (error: any) {
          // Graceful degradation on fetch failure
          const domain = (() => {
            try {
              return new URL(source.url).hostname;
            } catch {
              return source.url;
            }
          })();

          return {
            sourceId: source.id,
            domain,
            error: error.message || "Failed to fetch metadata",
          };
        }
      }),
    );

    // Update message with enriched metadata
    await ctx.runMutation(internal.messages.updateSourceMetadata, {
      messageId,
      metadata,
    });
  },
});

/**
 * Fetch OpenGraph metadata from a URL
 * Uses a simple HTML scraping approach
 * For production, consider using a service like unfurl.io or opengraph.io
 */
async function fetchOpenGraph(
  url: string,
  timeoutMs = 5000,
): Promise<{
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Bot/1.0; +http://example.com/bot)",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Simple regex-based OpenGraph extraction
    // For production, consider using a proper HTML parser or external API
    const ogTitle =
      html.match(/<meta property="og:title" content="([^"]+)"/) ||
      html.match(/<title>([^<]+)<\/title>/);
    const ogDescription = html.match(
      /<meta property="og:description" content="([^"]+)"/,
    );
    const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);
    const favicon =
      html.match(/<link rel="icon" href="([^"]+)"/) ||
      html.match(/<link rel="shortcut icon" href="([^"]+)"/);

    return {
      title: ogTitle?.[1],
      description: ogDescription?.[1],
      image: ogImage?.[1],
      favicon: favicon?.[1],
    };
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

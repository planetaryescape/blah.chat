// Source Enrichment - Actions (Node.js runtime for crypto operations and web fetching)
"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

/**
 * Enriches source citations with OpenGraph metadata (Phase 2: writes to sourceMetadata table)
 * Runs asynchronously after message completion to avoid blocking
 */
export const enrichSourceMetadata = internalAction({
  args: {
    messageId: v.id("messages"),
    sourceUrls: v.array(v.string()), // Changed: just URLs, no IDs
  },
  handler: async (ctx, { messageId, sourceUrls }) => {
    const crypto = await import("node:crypto");

    // Generate URL hash for each URL
    const generateUrlHash = (url: string): string => {
      try {
        const parsed = new URL(url);
        parsed.hostname = parsed.hostname.toLowerCase();
        if (parsed.pathname.endsWith("/") && parsed.pathname.length > 1) {
          parsed.pathname = parsed.pathname.slice(0, -1);
        }
        const normalized = parsed.href;
        return crypto
          .createHash("sha256")
          .update(normalized)
          .digest("hex")
          .substring(0, 16);
      } catch {
        return crypto
          .createHash("sha256")
          .update(url)
          .digest("hex")
          .substring(0, 16);
      }
    };

    // Fetch OpenGraph metadata for each source in parallel
    const enrichedData = await Promise.all(
      sourceUrls.map(async (url) => {
        try {
          const domain = new URL(url).hostname;
          const urlHash = generateUrlHash(url);

          // Fetch OpenGraph data
          const ogData = await fetchOpenGraph(url);

          return {
            urlHash,
            url,
            title: ogData.title,
            description: ogData.description,
            ogImage: ogData.image,
            favicon:
              ogData.favicon ||
              `https://www.google.com/s2/favicons?domain=${domain}`,
            siteName: ogData.siteName,
            enriched: true,
            error: undefined,
          };
          // biome-ignore lint/suspicious/noExplicitAny: Error object types
        } catch (error: any) {
          // Graceful degradation on fetch failure
          const urlHash = generateUrlHash(url);
          return {
            urlHash,
            url,
            enriched: false,
            error: error.message || "Failed to fetch metadata",
          };
        }
      }),
    );

    // Update sourceMetadata table
    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.sources.enrichment.updateSourceMetadataBatch,
      { enrichedData },
    );
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
  siteName?: string;
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
    const ogSiteName = html.match(
      /<meta property="og:site_name" content="([^"]+)"/,
    );
    const favicon =
      html.match(/<link rel="icon" href="([^"]+)"/) ||
      html.match(/<link rel="shortcut icon" href="([^"]+)"/);

    return {
      title: ogTitle?.[1],
      description: ogDescription?.[1],
      image: ogImage?.[1],
      favicon: favicon?.[1],
      siteName: ogSiteName?.[1],
    };
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

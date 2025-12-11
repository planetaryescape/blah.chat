// Source Operations - Actions (Node.js runtime for URL hash generation)
"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Add sources to a message during generation.
 * Creates deduplicated sourceMetadata records and per-message source references.
 */
export const addSources = internalAction({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    provider: v.string(), // "openrouter" | "perplexity" | "generic"
    sources: v.array(
      v.object({
        position: v.number(), // 1, 2, 3 for citation markers
        title: v.string(),
        url: v.string(),
        snippet: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Generate URL hashes (Node.js crypto available here)
    const crypto = await import("node:crypto");
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
        // Fallback for invalid URLs
        return crypto
          .createHash("sha256")
          .update(url)
          .digest("hex")
          .substring(0, 16);
      }
    };

    // Compute hashes for all sources
    const sourcesWithHashes = args.sources.map((src) => ({
      ...src,
      urlHash: generateUrlHash(src.url),
    }));

    // Call mutation to insert (with pre-computed hashes)
    const result = (await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.sources.operations.insertSourcesWithHashes,
      {
        messageId: args.messageId,
        conversationId: args.conversationId,
        userId: args.userId,
        provider: args.provider,
        sources: sourcesWithHashes,
      },
    )) as { metadataCreated: number; sourcesCreated: number; unenrichedUrls: string[] };

    // Schedule enrichment for unenriched URLs
    if (result.unenrichedUrls.length > 0) {
      await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.sources.enrichment_actions.enrichSourceMetadata,
        {
          messageId: args.messageId,
          sourceUrls: result.unenrichedUrls,
        },
      );
    }

    return result;
  },
});

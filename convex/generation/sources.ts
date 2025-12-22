/**
 * Source Extraction Utilities
 *
 * Extracts sources/citations from AI provider responses (Perplexity, OpenRouter, etc.)
 * and webSearch tool results for unified source numbering.
 */

export interface Source {
  position: number;
  title: string;
  url: string;
  publishedDate?: string;
  snippet?: string;
}

export interface ToolCallResult {
  id: string;
  name: string;
  result?: string;
}

/**
 * Extract sources/citations from AI SDK response (Perplexity via OpenRouter)
 */
// biome-ignore lint/suspicious/noExplicitAny: Complex provider metadata types from AI SDK
export function extractSources(providerMetadata: any): Source[] | undefined {
  if (!providerMetadata) return undefined;

  try {
    const allSources: Array<{
      title: string;
      url: string;
      snippet?: string;
      publishedDate?: string;
    }> = [];

    const openRouterMeta = providerMetadata.openrouter || providerMetadata;
    const perplexityMeta = providerMetadata.perplexity || providerMetadata;

    // 1. OpenRouter / Perplexity search_results format
    if (
      Array.isArray(openRouterMeta?.search_results) &&
      openRouterMeta.search_results.length > 0
    ) {
      allSources.push(
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic provider response structure
        ...openRouterMeta.search_results.map((r: any) => ({
          title: r.title || r.name || "Untitled Source",
          url: r.url,
          publishedDate: r.date || r.published_date,
          snippet: r.snippet || r.description,
        })),
      );
    }

    // 2. Perplexity Native citations
    const perplexitySources = perplexityMeta?.citations;
    if (Array.isArray(perplexitySources) && perplexitySources.length > 0) {
      const mapped = perplexitySources
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic citation format
        .map((r: any) => {
          if (typeof r === "string") {
            return {
              title: r,
              url: r,
              snippet: undefined,
              publishedDate: undefined,
            };
          }
          return {
            title: r.title || "Untitled Source",
            url: r.url,
            snippet: r.snippet,
            publishedDate: undefined,
          };
        })
        .filter((s) => s.url);
      allSources.push(...mapped);
    }

    // 3. Generic citations/sources - FIXED: explicit array checks, no OR-chain
    const potentialSources = [
      openRouterMeta?.citations,
      openRouterMeta?.sources,
      providerMetadata?.citations,
      providerMetadata?.sources,
      // biome-ignore lint/suspicious/noExplicitAny: Nested provider metadata
      (providerMetadata as any)?.extra?.citations,
    ].filter((arr) => Array.isArray(arr) && arr.length > 0);

    for (const sourceArray of potentialSources) {
      const mapped = sourceArray
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic source format
        .map((r: any) => {
          if (typeof r === "string") {
            return {
              title: r,
              url: r,
              snippet: undefined,
              publishedDate: undefined,
            };
          }
          return {
            title: r.title || r.name || "Untitled Source",
            url: r.url || r.uri || "",
            publishedDate: r.date || r.published_date,
            snippet: r.snippet || r.description,
          };
        })
        // biome-ignore lint/suspicious/noExplicitAny: Filter for valid URLs
        .filter((s: any) => s.url && s.url.length > 0);
      allSources.push(...mapped);
    }

    if (allSources.length === 0) return undefined;

    // Deduplicate by URL (case-insensitive, trimmed)
    const seenUrls = new Set<string>();
    const deduped = allSources.filter((s) => {
      const normalizedUrl = s.url.toLowerCase().trim();
      if (seenUrls.has(normalizedUrl)) return false;
      seenUrls.add(normalizedUrl);
      return true;
    });

    // Assign sequential positions for citation markers AFTER deduplication
    return deduped.map((s, i) => ({
      position: i + 1,
      title: s.title,
      url: s.url,
      publishedDate: s.publishedDate,
      snippet: s.snippet,
    }));
  } catch (error) {
    console.warn("[Sources] Failed to extract sources:", error);
    return undefined;
  }
}

/**
 * Extract sources from webSearch/tavilySearch tool calls
 * @param allToolCalls - Array of finalized tool calls from buffer
 * @param startPosition - Offset for unified numbering (Perplexity source count)
 * @returns Array of sources with pre-computed positions for unified numbering
 */
export function extractWebSearchSources(
  allToolCalls: ToolCallResult[],
  startPosition: number,
): Source[] {
  const webSearchSources: Source[] = [];

  for (const tc of allToolCalls) {
    // Support both old "webSearch" and new "tavilySearch"/"tavilyAdvancedSearch" tool names
    if (tc.name !== "webSearch" && tc.name !== "tavilySearch" && tc.name !== "tavilyAdvancedSearch") continue;
    if (!tc.result) continue;

    try {
      const result = JSON.parse(tc.result);

      // Handle both formats:
      // Old format: { success: true, results: [...] }
      // New tavilySearch format: { results: [...], answer: "...", query: "..." }
      const results = result.results;
      if (!Array.isArray(results)) continue;

      // For old format, also check success flag
      if (tc.name === "webSearch" && result.success === false) continue;

      // Extract each result as a source
      for (const item of results) {
        if (!item.url) continue; // Skip results without URLs

        webSearchSources.push({
          position: startPosition + webSearchSources.length + 1,
          title: item.title || item.url, // Fallback to URL if no title
          url: item.url,
          snippet: item.content?.substring(0, 500), // Truncate long snippets
          publishedDate: item.publishedDate, // tavilySearch includes publishedDate
        });
      }
    } catch (e) {
      console.warn(
        `[WebSearch] Failed to parse result for tool call ${tc.id}:`,
        e,
      );
      // Continue processing other tool calls
    }
  }

  return webSearchSources;
}

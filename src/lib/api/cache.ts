/**
 * HTTP cache control helpers for API optimization
 * Phase 7: Performance - Enable client/CDN caching
 */

export interface CacheConfig {
  /** Cache TTL in seconds */
  maxAge?: number;
  /** Stale-while-revalidate duration in seconds */
  swr?: number;
  /** Allow CDN caching (default: false for private data) */
  public?: boolean;
}

/**
 * Generate Cache-Control header value
 *
 * @example
 * getCacheControl({ maxAge: 30, swr: 60 })
 * // Returns: "private, max-age=30, stale-while-revalidate=60"
 */
export function getCacheControl(config: CacheConfig): string {
  const parts: string[] = [];

  // Public vs private (default: private for auth-required endpoints)
  parts.push(config.public ? "public" : "private");

  // Max age (cache TTL)
  if (config.maxAge !== undefined && config.maxAge > 0) {
    parts.push(`max-age=${config.maxAge}`);
  } else {
    parts.push("no-cache");
  }

  // Stale-while-revalidate (serve stale, revalidate in background)
  if (config.swr && config.swr > 0) {
    parts.push(`stale-while-revalidate=${config.swr}`);
  }

  return parts.join(", ");
}

/**
 * Common cache configurations for different endpoint types
 */
export const CachePresets = {
  /**
   * Short cache for lists (30s fresh, 60s stale-while-revalidate)
   * Use for: conversation lists, message lists
   */
  LIST: {
    maxAge: 30,
    swr: 60,
    public: false,
  } as CacheConfig,

  /**
   * Medium cache for single items (5min fresh, 10min stale)
   * Use for: single conversation, single message
   */
  ITEM: {
    maxAge: 300,
    swr: 600,
    public: false,
  } as CacheConfig,

  /**
   * Long cache for static/rarely-changing data (1h fresh, 2h stale)
   * Use for: user preferences, model configs
   */
  STATIC: {
    maxAge: 3600,
    swr: 7200,
    public: false,
  } as CacheConfig,

  /**
   * No cache for real-time data
   * Use for: SSE streams, webhooks, generation endpoints
   */
  NO_CACHE: {
    maxAge: 0,
    public: false,
  } as CacheConfig,

  /**
   * Short cache for frequently accessed but slowly changing data
   * Use for: search results, bookmarks
   */
  SHORT: {
    maxAge: 10,
    swr: 30,
    public: false,
  } as CacheConfig,
};

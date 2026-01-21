/**
 * LRU Cache for Parsed Markdown
 *
 * Caches parsed HTML to avoid re-parsing unchanged content.
 * Uses content hash as key for deduplication.
 */

interface CacheEntry {
  html: string;
  timestamp: number;
}

const MAX_ENTRIES = 200;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

class MarkdownCache {
  private cache = new Map<string, CacheEntry>();

  /**
   * Generate a simple hash from content for cache key
   * Uses djb2 algorithm - fast and good distribution
   */
  private hash(content: string): string {
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
      hash = (hash * 33) ^ content.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
  }

  /**
   * Get cached HTML for content
   * Returns null if not cached or expired
   */
  get(content: string): string | null {
    const key = this.hash(content);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    // Move to end for LRU (Map maintains insertion order)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.html;
  }

  /**
   * Cache parsed HTML for content
   */
  set(content: string, html: string): void {
    const key = this.hash(content);

    // Evict oldest entries if at capacity
    while (this.cache.size >= MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      html,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if content is cached (without retrieving)
   */
  has(content: string): boolean {
    const key = this.hash(content);
    const entry = this.cache.get(key);

    if (!entry) return false;

    // Check TTL
    if (Date.now() - entry.timestamp > TTL_MS) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats for debugging
   */
  get stats() {
    return {
      size: this.cache.size,
      maxSize: MAX_ENTRIES,
      ttlMs: TTL_MS,
    };
  }
}

// Singleton instance
let instance: MarkdownCache | null = null;

export function getMarkdownCache(): MarkdownCache {
  if (!instance) {
    instance = new MarkdownCache();
  }
  return instance;
}

export { MarkdownCache };

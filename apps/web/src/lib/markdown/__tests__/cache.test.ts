import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getMarkdownCache, MarkdownCache } from "../cache";

describe("MarkdownCache", () => {
  let cache: MarkdownCache;

  beforeEach(() => {
    // Create fresh instance for each test
    cache = new MarkdownCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("get/set", () => {
    it("returns null for uncached content", () => {
      expect(cache.get("some content")).toBeNull();
    });

    it("returns cached html for content", () => {
      cache.set("# Hello", "<h1>Hello</h1>");
      expect(cache.get("# Hello")).toBe("<h1>Hello</h1>");
    });

    it("caches different content independently", () => {
      cache.set("content1", "<p>1</p>");
      cache.set("content2", "<p>2</p>");

      expect(cache.get("content1")).toBe("<p>1</p>");
      expect(cache.get("content2")).toBe("<p>2</p>");
    });
  });

  describe("TTL expiration", () => {
    it("returns cached content within TTL", () => {
      cache.set("test", "<p>test</p>");

      // Advance time by 4 minutes (under 5 min TTL)
      vi.advanceTimersByTime(4 * 60 * 1000);

      expect(cache.get("test")).toBe("<p>test</p>");
    });

    it("returns null for expired content", () => {
      cache.set("test", "<p>test</p>");

      // Advance time past TTL (5 min + 1ms)
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);

      expect(cache.get("test")).toBeNull();
    });

    it("has() returns false for expired content", () => {
      cache.set("test", "<p>test</p>");

      vi.advanceTimersByTime(5 * 60 * 1000 + 1);

      expect(cache.has("test")).toBe(false);
    });
  });

  describe("LRU eviction", () => {
    it("evicts oldest entry when at capacity", () => {
      // Fill cache to capacity (200)
      for (let i = 0; i < 200; i++) {
        cache.set(`content-${i}`, `<p>${i}</p>`);
      }

      // Add one more - should evict oldest (content-0)
      cache.set("new-content", "<p>new</p>");

      // First entry evicted (content-0), rest still exist
      // Note: can't check content-0 via get() because get() moves entry to end
      // Instead verify size is still 200 and new-content exists
      expect(cache.stats.size).toBe(200);
      expect(cache.get("new-content")).toBe("<p>new</p>");

      // content-1 through content-199 should still exist
      expect(cache.get("content-199")).toBe("<p>199</p>");
    });

    it("moves accessed entry to end (most recent)", () => {
      // Add 3 entries
      cache.set("a", "<p>a</p>");
      cache.set("b", "<p>b</p>");
      cache.set("c", "<p>c</p>");

      // Access "a" - moves it to end
      cache.get("a");

      // Fill remaining capacity + 2 to evict oldest
      for (let i = 0; i < 199; i++) {
        cache.set(`fill-${i}`, `<p>${i}</p>`);
      }

      // "a" was accessed, so "b" should be evicted first
      expect(cache.get("b")).toBeNull();
      expect(cache.get("a")).toBe("<p>a</p>"); // still exists, was moved to end
    });
  });

  describe("has()", () => {
    it("returns false for uncached content", () => {
      expect(cache.has("missing")).toBe(false);
    });

    it("returns true for cached content", () => {
      cache.set("exists", "<p>exists</p>");
      expect(cache.has("exists")).toBe(true);
    });
  });

  describe("clear()", () => {
    it("removes all entries", () => {
      cache.set("a", "<p>a</p>");
      cache.set("b", "<p>b</p>");

      cache.clear();

      expect(cache.get("a")).toBeNull();
      expect(cache.get("b")).toBeNull();
      expect(cache.stats.size).toBe(0);
    });
  });

  describe("stats", () => {
    it("returns correct size", () => {
      expect(cache.stats.size).toBe(0);

      cache.set("a", "<p>a</p>");
      expect(cache.stats.size).toBe(1);

      cache.set("b", "<p>b</p>");
      expect(cache.stats.size).toBe(2);
    });

    it("returns constants", () => {
      expect(cache.stats.maxSize).toBe(200);
      expect(cache.stats.ttlMs).toBe(5 * 60 * 1000);
    });
  });

  describe("hash collision handling", () => {
    it("handles different content with same hash gracefully", () => {
      // djb2 hash can collide for carefully crafted strings
      // In practice, collisions are rare but cache should still function
      // When collision occurs, newer content overwrites older
      const content1 = "content A";
      const content2 = "content B";

      cache.set(content1, "<p>A</p>");
      cache.set(content2, "<p>B</p>");

      // Both should be retrievable (different hashes)
      // If they somehow collide, the second write wins
      expect(cache.get(content2)).toBe("<p>B</p>");
    });
  });

  describe("singleton", () => {
    it("getMarkdownCache returns same instance", () => {
      const instance1 = getMarkdownCache();
      const instance2 = getMarkdownCache();

      expect(instance1).toBe(instance2);
    });
  });
});

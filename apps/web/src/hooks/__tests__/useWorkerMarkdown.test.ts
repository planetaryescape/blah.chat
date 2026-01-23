import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the worker-manager module
vi.mock("@/lib/markdown/worker-manager", () => ({
  parseMarkdownInWorker: vi.fn(),
}));

// Mock the cache module
vi.mock("@/lib/markdown/cache", () => ({
  getMarkdownCache: vi.fn(() => ({
    get: vi.fn(() => null),
    set: vi.fn(),
    has: vi.fn(() => false),
  })),
}));

import { getMarkdownCache } from "@/lib/markdown/cache";
import { parseMarkdownInWorker } from "@/lib/markdown/worker-manager";
import { useWorkerMarkdown } from "../useWorkerMarkdown";

describe("useWorkerMarkdown", () => {
  const mockParseMarkdownInWorker = vi.mocked(parseMarkdownInWorker);
  const mockGetMarkdownCache = vi.mocked(getMarkdownCache);

  let mockCache: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    has: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCache = {
      get: vi.fn(() => null),
      set: vi.fn(),
      has: vi.fn(() => false),
    };
    mockGetMarkdownCache.mockReturnValue(mockCache as any);
    mockParseMarkdownInWorker.mockResolvedValue("<p>parsed</p>");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("threshold behavior", () => {
    it("returns null for small content (< 5KB)", () => {
      const smallContent = "Hello world"; // ~11 bytes

      const { result } = renderHook(() =>
        useWorkerMarkdown(smallContent, false),
      );

      expect(result.current.html).toBeNull();
      expect(result.current.isParsing).toBe(false);
      expect(mockParseMarkdownInWorker).not.toHaveBeenCalled();
    });

    it("uses worker for large content (>= 5KB)", async () => {
      const largeContent = "x".repeat(5000); // 5KB

      const { result } = renderHook(() =>
        useWorkerMarkdown(largeContent, false),
      );

      await waitFor(() => {
        expect(mockParseMarkdownInWorker).toHaveBeenCalledWith(largeContent);
      });

      await waitFor(() => {
        expect(result.current.html).toBe("<p>parsed</p>");
      });
    });

    it("boundary: 4999 bytes skips worker, 5000 uses it", async () => {
      const under = "x".repeat(4999);
      const exact = "x".repeat(5000);

      const { result: underResult } = renderHook(() =>
        useWorkerMarkdown(under, false),
      );
      expect(underResult.current.html).toBeNull();

      vi.clearAllMocks();

      renderHook(() => useWorkerMarkdown(exact, false));

      await waitFor(() => {
        expect(mockParseMarkdownInWorker).toHaveBeenCalled();
      });
    });
  });

  describe("streaming bypass", () => {
    it("returns null when streaming even for large content", () => {
      const largeContent = "x".repeat(10000);

      const { result } = renderHook(() =>
        useWorkerMarkdown(largeContent, true),
      );

      expect(result.current.html).toBeNull();
      expect(mockParseMarkdownInWorker).not.toHaveBeenCalled();
    });

    it("switches to worker when streaming ends", async () => {
      const largeContent = "x".repeat(6000);

      const { result, rerender } = renderHook(
        ({ content, isStreaming }) => useWorkerMarkdown(content, isStreaming),
        { initialProps: { content: largeContent, isStreaming: true } },
      );

      // Streaming: worker not used
      expect(result.current.html).toBeNull();
      expect(mockParseMarkdownInWorker).not.toHaveBeenCalled();

      // Stop streaming
      rerender({ content: largeContent, isStreaming: false });

      await waitFor(() => {
        expect(mockParseMarkdownInWorker).toHaveBeenCalledWith(largeContent);
      });

      await waitFor(() => {
        expect(result.current.html).toBe("<p>parsed</p>");
      });
    });
  });

  describe("cache integration", () => {
    it("returns cached HTML immediately without calling worker", () => {
      const cachedHtml = "<h1>Cached</h1>";
      mockCache.get.mockReturnValue(cachedHtml);

      const largeContent = "x".repeat(6000);

      const { result } = renderHook(() =>
        useWorkerMarkdown(largeContent, false),
      );

      expect(result.current.html).toBe(cachedHtml);
      expect(mockParseMarkdownInWorker).not.toHaveBeenCalled();
    });

    it("caches successful parse results", async () => {
      const largeContent = "x".repeat(6000);
      const parsedHtml = "<p>parsed</p>";
      mockParseMarkdownInWorker.mockResolvedValue(parsedHtml);

      const { result } = renderHook(() =>
        useWorkerMarkdown(largeContent, false),
      );

      await waitFor(() => {
        expect(result.current.html).toBe(parsedHtml);
      });

      expect(mockCache.set).toHaveBeenCalledWith(largeContent, parsedHtml);
    });

    it("does not cache when worker returns null", async () => {
      mockParseMarkdownInWorker.mockResolvedValue(null);

      const largeContent = "x".repeat(6000);

      const { result } = renderHook(() =>
        useWorkerMarkdown(largeContent, false),
      );

      await waitFor(() => {
        expect(result.current.isParsing).toBe(false);
      });

      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe("loading state", () => {
    it("sets isParsing true while parsing", async () => {
      let resolvePromise: (value: string) => void;
      mockParseMarkdownInWorker.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
      );

      const largeContent = "x".repeat(6000);

      const { result } = renderHook(() =>
        useWorkerMarkdown(largeContent, false),
      );

      await waitFor(() => {
        expect(result.current.isParsing).toBe(true);
      });

      // Resolve parsing
      await act(async () => {
        resolvePromise!("<p>done</p>");
      });

      await waitFor(() => {
        expect(result.current.isParsing).toBe(false);
      });
    });
  });

  describe("error handling", () => {
    it("sets error on parse failure", async () => {
      mockParseMarkdownInWorker.mockRejectedValue(new Error("Parse failed"));

      const largeContent = "x".repeat(6000);

      const { result } = renderHook(() =>
        useWorkerMarkdown(largeContent, false),
      );

      await waitFor(() => {
        expect(result.current.error).toBe("Parse failed");
      });

      expect(result.current.html).toBeNull();
    });

    it("clears error on successful parse", async () => {
      mockParseMarkdownInWorker
        .mockRejectedValueOnce(new Error("First fail"))
        .mockResolvedValueOnce("<p>success</p>");

      const largeContent = "x".repeat(6000);

      const { result, rerender } = renderHook(
        ({ content }) => useWorkerMarkdown(content, false),
        { initialProps: { content: largeContent } },
      );

      await waitFor(() => {
        expect(result.current.error).toBe("First fail");
      });

      // Trigger new parse with different content
      rerender({ content: `${largeContent}x` });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.html).toBe("<p>success</p>");
      });
    });
  });

  describe("cancellation", () => {
    it("ignores results from stale requests", async () => {
      const resolvers: Array<(value: string | null) => void> = [];
      mockParseMarkdownInWorker.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvers.push(resolve);
          }),
      );

      const { result, rerender } = renderHook(
        ({ content }) => useWorkerMarkdown(content, false),
        { initialProps: { content: "x".repeat(6000) } },
      );

      // First request starts
      await waitFor(() => {
        expect(resolvers.length).toBe(1);
      });

      // Content changes - new request
      rerender({ content: "y".repeat(6000) });

      await waitFor(() => {
        expect(resolvers.length).toBe(2);
      });

      // Resolve first (stale) request
      await act(async () => {
        resolvers[0]("<p>stale</p>");
      });

      // Resolve second (current) request
      await act(async () => {
        resolvers[1]("<p>current</p>");
      });

      // Should use current result, not stale
      await waitFor(() => {
        expect(result.current.html).toBe("<p>current</p>");
      });
    });
  });
});

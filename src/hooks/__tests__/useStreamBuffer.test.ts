import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the markdown tokens utility
vi.mock("@/lib/utils/markdownTokens", () => ({
  getNextCompleteToken: (buffer: string, chars: number) =>
    buffer.slice(0, Math.min(chars, buffer.length)),
}));

import { useStreamBuffer } from "../useStreamBuffer";

describe("useStreamBuffer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty initially", () => {
    const { result } = renderHook(() => useStreamBuffer("", false));

    expect(result.current.displayContent).toBe("");
    expect(result.current.hasBufferedContent).toBe(false);
  });

  it("flushes immediately when not streaming", () => {
    const { result } = renderHook(() => useStreamBuffer("Hello world", false));

    expect(result.current.displayContent).toBe("Hello world");
  });

  it("handles non-monotonic content (server edits)", () => {
    const { result, rerender } = renderHook(
      ({ content, streaming }) => useStreamBuffer(content, streaming),
      { initialProps: { content: "Hello", streaming: false } },
    );

    expect(result.current.displayContent).toBe("Hello");

    // Server replaces content (not appends)
    rerender({ content: "Replaced", streaming: false });

    expect(result.current.displayContent).toBe("Replaced");
  });

  it("returns hasBufferedContent false when nothing buffered", () => {
    const { result } = renderHook(() => useStreamBuffer("Test content", false));

    expect(result.current.hasBufferedContent).toBe(false);
  });

  it("accepts custom options", () => {
    const { result } = renderHook(() =>
      useStreamBuffer("Test", false, {
        charsPerSecond: 500,
        minTokenSize: 1,
        adaptiveThreshold: 10000,
      }),
    );

    expect(result.current.displayContent).toBe("Test");
  });
});

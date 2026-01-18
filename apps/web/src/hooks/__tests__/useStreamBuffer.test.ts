import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    expect(result.current.newWordsCount).toBe(0);
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

  it("accepts custom wordsPerSecond option", () => {
    const { result } = renderHook(() =>
      useStreamBuffer("Test content here", false, {
        wordsPerSecond: 50,
      }),
    );

    expect(result.current.displayContent).toBe("Test content here");
  });

  it("resets newWordsCount when streaming stops", () => {
    const { result, rerender } = renderHook(
      ({ content, streaming }) => useStreamBuffer(content, streaming),
      { initialProps: { content: "Hello world", streaming: true } },
    );

    // Stop streaming
    rerender({ content: "Hello world", streaming: false });

    expect(result.current.newWordsCount).toBe(0);
  });
});

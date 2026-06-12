import { act, renderHook } from "@testing-library/react";
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

  it("shows existing content immediately when mounted mid-stream", () => {
    // Remount during generation (navigation back, StrictMode) must not
    // replay the whole message as a catch-up animation.
    const { result } = renderHook(() =>
      useStreamBuffer("Already streamed content", true),
    );

    expect(result.current.displayContent).toBe("Already streamed content");
    expect(result.current.hasBufferedContent).toBe(false);
  });

  it("reveals appended content gradually while streaming", () => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "Date",
      ],
    });

    const { result, rerender } = renderHook(
      ({ content, streaming }) => useStreamBuffer(content, streaming),
      { initialProps: { content: "Start ", streaming: true } },
    );

    expect(result.current.displayContent).toBe("Start ");

    const full = "Start one two three four five six seven eight nine ten ";
    rerender({ content: full, streaming: true });

    // Chunk lands in the buffer, not the display
    expect(result.current.displayContent).toBe("Start ");

    // A few frames in: some words released, but not the whole chunk
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.hasBufferedContent).toBe(true);
    expect(result.current.displayContent.length).toBeGreaterThan(
      "Start ".length,
    );
    expect(result.current.displayContent.length).toBeLessThan(full.length);

    // Eventually the buffer drains fully
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current.displayContent).toBe(full);
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

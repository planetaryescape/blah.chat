import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAutoScroll } from "../useAutoScroll";

// Helper to create a mock container element
const createMockContainer = (overrides: Partial<HTMLDivElement> = {}) => {
  const element = {
    scrollHeight: 1000,
    scrollTop: 900,
    clientHeight: 100,
    scrollTo: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    ...overrides,
  } as unknown as HTMLDivElement;
  return element;
};

describe("useAutoScroll", () => {
  it("returns expected interface", () => {
    const { result } = renderHook(() => useAutoScroll());

    expect(result.current).toHaveProperty("containerRef");
    expect(result.current).toHaveProperty("scrollToBottom");
    expect(result.current).toHaveProperty("showScrollButton");
    expect(result.current).toHaveProperty("isAtBottom");
    expect(typeof result.current.scrollToBottom).toBe("function");
  });

  it("defaults isAtBottom to true", () => {
    const { result } = renderHook(() => useAutoScroll());

    expect(result.current.isAtBottom).toBe(true);
  });

  it("defaults showScrollButton to false", () => {
    const { result } = renderHook(() => useAutoScroll());

    expect(result.current.showScrollButton).toBe(false);
  });

  it("scrollToBottom returns false when no container", () => {
    const { result } = renderHook(() => useAutoScroll());

    // containerRef.current is null
    const success = result.current.scrollToBottom();

    expect(success).toBe(false);
  });

  it("scrollToBottom returns true when container exists", () => {
    const { result } = renderHook(() => useAutoScroll());

    // Manually set ref (simulating component mount)
    const mockContainer = createMockContainer();
    (
      result.current.containerRef as { current: HTMLDivElement | null }
    ).current = mockContainer;

    const success = result.current.scrollToBottom();

    expect(success).toBe(true);
    expect(mockContainer.scrollTo).toHaveBeenCalled();
  });

  it("accepts custom threshold option", () => {
    const { result } = renderHook(() => useAutoScroll({ threshold: 200 }));

    expect(result.current).toBeDefined();
  });
});

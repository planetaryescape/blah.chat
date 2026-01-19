import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useHoverIntent } from "../useHoverIntent";

describe("useHoverIntent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with isHovered false", () => {
    const { result } = renderHook(() => useHoverIntent());
    expect(result.current.isHovered).toBe(false);
  });

  it("delays hover by default 350ms", () => {
    const { result } = renderHook(() => useHoverIntent());

    act(() => {
      result.current.handleMouseEnter();
    });

    // Still false immediately
    expect(result.current.isHovered).toBe(false);

    // Still false at 349ms
    act(() => {
      vi.advanceTimersByTime(349);
    });
    expect(result.current.isHovered).toBe(false);

    // True at 350ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.isHovered).toBe(true);
  });

  it("cancels hover on quick mouse leave (<350ms)", () => {
    const { result } = renderHook(() => useHoverIntent());

    act(() => {
      result.current.handleMouseEnter();
    });

    // Leave before delay completes
    act(() => {
      vi.advanceTimersByTime(200);
      result.current.handleMouseLeave();
    });

    // Wait for all timers
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.isHovered).toBe(false);
  });

  it("shows immediately on focus (a11y)", () => {
    const { result } = renderHook(() => useHoverIntent());

    act(() => {
      result.current.handleFocus();
    });

    // Immediate, no delay
    expect(result.current.isHovered).toBe(true);
  });

  it("hides immediately on blur", () => {
    const { result } = renderHook(() => useHoverIntent());

    act(() => {
      result.current.handleFocus();
    });
    expect(result.current.isHovered).toBe(true);

    act(() => {
      result.current.handleBlur();
    });
    expect(result.current.isHovered).toBe(false);
  });

  it("delays hide by 150ms on mouse leave", () => {
    const { result } = renderHook(() => useHoverIntent());

    // First, enter and wait for hover
    act(() => {
      result.current.handleMouseEnter();
      vi.advanceTimersByTime(350);
    });
    expect(result.current.isHovered).toBe(true);

    // Leave
    act(() => {
      result.current.handleMouseLeave();
    });

    // Still true immediately
    expect(result.current.isHovered).toBe(true);

    // Still true at 149ms
    act(() => {
      vi.advanceTimersByTime(149);
    });
    expect(result.current.isHovered).toBe(true);

    // False at 150ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.isHovered).toBe(false);
  });

  it("cancels leave timer on re-enter", () => {
    const { result } = renderHook(() => useHoverIntent());

    // Enter and wait for hover
    act(() => {
      result.current.handleMouseEnter();
      vi.advanceTimersByTime(350);
    });
    expect(result.current.isHovered).toBe(true);

    // Leave
    act(() => {
      result.current.handleMouseLeave();
    });

    // Re-enter before leave completes
    act(() => {
      vi.advanceTimersByTime(100);
      result.current.handleMouseEnter();
    });

    // Wait for all timers
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should stay hovered
    expect(result.current.isHovered).toBe(true);
  });

  it("accepts custom delays", () => {
    const { result } = renderHook(() =>
      useHoverIntent({ enterDelay: 100, leaveDelay: 50 }),
    );

    act(() => {
      result.current.handleMouseEnter();
      vi.advanceTimersByTime(100);
    });
    expect(result.current.isHovered).toBe(true);

    act(() => {
      result.current.handleMouseLeave();
      vi.advanceTimersByTime(50);
    });
    expect(result.current.isHovered).toBe(false);
  });

  it("cleans up timers on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    const { result, unmount } = renderHook(() => useHoverIntent());

    // Start a timer
    act(() => {
      result.current.handleMouseEnter();
    });

    // Unmount before timer fires
    unmount();

    // Should have called clearTimeout
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});

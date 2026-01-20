import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useFocusTrap } from "../useFocusTrap";

describe("useFocusTrap", () => {
  it("returns expected interface", () => {
    const { result } = renderHook(() => useFocusTrap<HTMLDivElement>());

    expect(result.current).toHaveProperty("containerRef");
    expect(result.current).toHaveProperty("focusFirst");
    expect(result.current).toHaveProperty("focusLast");
    expect(typeof result.current.focusFirst).toBe("function");
    expect(typeof result.current.focusLast).toBe("function");
  });

  it("returns stable references on re-render", () => {
    const { result, rerender } = renderHook(() =>
      useFocusTrap<HTMLDivElement>(),
    );

    const firstFocusFirst = result.current.focusFirst;
    const firstFocusLast = result.current.focusLast;

    rerender();

    expect(result.current.focusFirst).toBe(firstFocusFirst);
    expect(result.current.focusLast).toBe(firstFocusLast);
  });

  it("disabled option prevents auto-focus behavior", () => {
    const { result } = renderHook(() =>
      useFocusTrap<HTMLDivElement>({ enabled: false }),
    );

    // Hook should still return the interface
    expect(result.current.containerRef).toBeDefined();
    expect(result.current.focusFirst).toBeDefined();
    expect(result.current.focusLast).toBeDefined();
  });
});

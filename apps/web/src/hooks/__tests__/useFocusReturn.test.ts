import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFocusReturn } from "../useFocusReturn";

describe("useFocusReturn", () => {
  let triggerButton: HTMLButtonElement;

  beforeEach(() => {
    triggerButton = document.createElement("button");
    triggerButton.textContent = "Trigger";
    document.body.appendChild(triggerButton);
    triggerButton.focus();
  });

  afterEach(() => {
    document.body.removeChild(triggerButton);
    vi.clearAllMocks();
  });

  it("returns expected interface", () => {
    const { result } = renderHook(() => useFocusReturn());

    expect(result.current).toHaveProperty("returnFocus");
    expect(result.current).toHaveProperty("setReturnTarget");
    expect(typeof result.current.returnFocus).toBe("function");
    expect(typeof result.current.setReturnTarget).toBe("function");
  });

  it("returnFocus restores focus to previously focused element", () => {
    // Trigger button is already focused from beforeEach
    expect(document.activeElement).toBe(triggerButton);

    const { result } = renderHook(() => useFocusReturn());

    // Simulate focus moving elsewhere
    const otherElement = document.createElement("button");
    document.body.appendChild(otherElement);
    otherElement.focus();
    expect(document.activeElement).toBe(otherElement);

    // Return focus
    act(() => {
      result.current.returnFocus();
    });

    expect(document.activeElement).toBe(triggerButton);

    // Cleanup
    document.body.removeChild(otherElement);
  });

  it("setReturnTarget allows overriding the return target", () => {
    const newTarget = document.createElement("button");
    newTarget.textContent = "New Target";
    document.body.appendChild(newTarget);

    const { result } = renderHook(() => useFocusReturn());

    // Override the return target
    act(() => {
      result.current.setReturnTarget(newTarget);
    });

    // Return focus should go to new target, not original
    act(() => {
      result.current.returnFocus();
    });

    expect(document.activeElement).toBe(newTarget);

    // Cleanup
    document.body.removeChild(newTarget);
  });

  it("returnFocus handles removed elements gracefully", () => {
    const { result } = renderHook(() => useFocusReturn());

    // Remove the trigger button
    document.body.removeChild(triggerButton);

    // Should not throw when element is no longer in DOM
    expect(() => {
      act(() => {
        result.current.returnFocus();
      });
    }).not.toThrow();

    // Re-add for afterEach cleanup
    document.body.appendChild(triggerButton);
  });
});

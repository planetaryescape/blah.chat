import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFocusOnAction } from "../useFocusOnAction";

describe("useFocusOnAction", () => {
  let targetButton: HTMLButtonElement;
  let fallbackButton: HTMLButtonElement;

  beforeEach(() => {
    targetButton = document.createElement("button");
    targetButton.textContent = "Target";
    targetButton.id = "target-btn";
    document.body.appendChild(targetButton);

    fallbackButton = document.createElement("button");
    fallbackButton.textContent = "Fallback";
    document.body.appendChild(fallbackButton);
  });

  afterEach(() => {
    document.body.removeChild(targetButton);
    document.body.removeChild(fallbackButton);
    vi.clearAllMocks();
  });

  it("returns expected interface", () => {
    const { result } = renderHook(() => useFocusOnAction());

    expect(result.current).toHaveProperty("focusAfterAction");
    expect(typeof result.current.focusAfterAction).toBe("function");
  });

  it("focuses target element after action", async () => {
    const { result } = renderHook(() => useFocusOnAction());

    act(() => {
      result.current.focusAfterAction({ element: targetButton });
    });

    // Wait for requestAnimationFrame
    await waitFor(() => {
      expect(document.activeElement).toBe(targetButton);
    });
  });

  it("focuses element by selector", async () => {
    const { result } = renderHook(() => useFocusOnAction());

    act(() => {
      result.current.focusAfterAction({ selector: "#target-btn" });
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(targetButton);
    });
  });

  it("uses fallback when target not found", async () => {
    const { result } = renderHook(() => useFocusOnAction());

    act(() => {
      result.current.focusAfterAction({
        selector: "#nonexistent",
        fallback: fallbackButton,
      });
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(fallbackButton);
    });
  });

  it("uses fallback when element removed from DOM", async () => {
    const removedElement = document.createElement("button");
    // Don't add to DOM

    const { result } = renderHook(() => useFocusOnAction());

    act(() => {
      result.current.focusAfterAction({
        element: removedElement,
        fallback: fallbackButton,
      });
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(fallbackButton);
    });
  });
});

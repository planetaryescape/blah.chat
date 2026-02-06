import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIOSKeyboard } from "../useIOSKeyboard";

describe("useIOSKeyboard", () => {
  const originalVisualViewport = window.visualViewport;
  let viewportHeight = 800;
  let listeners: Set<() => void>;
  let mockViewport: {
    height: number;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  const triggerResize = (newHeight: number) => {
    viewportHeight = newHeight;
    mockViewport.height = newHeight;
    act(() => {
      listeners.forEach((listener) => listener());
    });
  };

  beforeEach(() => {
    listeners = new Set();
    viewportHeight = 800;
    mockViewport = {
      get height() {
        return viewportHeight;
      },
      set height(value: number) {
        viewportHeight = value;
      },
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === "resize") listeners.add(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === "resize") listeners.delete(handler);
      }),
    };

    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: mockViewport,
    });

    vi.spyOn(window, "innerHeight", "get").mockReturnValue(900);
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "iPhone",
    });
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: "iPhone",
    });
    Object.defineProperty(window.navigator, "maxTouchPoints", {
      configurable: true,
      value: 1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalVisualViewport === undefined) {
      Reflect.deleteProperty(window, "visualViewport");
    } else {
      Object.defineProperty(window, "visualViewport", {
        configurable: true,
        value: originalVisualViewport,
      });
    }
  });

  it("tracks iOS keyboard show/hide from visualViewport resize only", () => {
    const onKeyboardShow = vi.fn();
    const onKeyboardHide = vi.fn();
    const input = document.createElement("textarea");
    const scrollIntoViewSpy = vi.fn();
    input.scrollIntoView = scrollIntoViewSpy;

    const { result, unmount } = renderHook(() =>
      useIOSKeyboard({
        inputRef: { current: input },
        onKeyboardShow,
        onKeyboardHide,
      }),
    );

    expect(mockViewport.addEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
    expect(mockViewport.addEventListener).toHaveBeenCalledTimes(1);

    triggerResize(580);
    expect(result.current.keyboardVisible).toBe(true);
    expect(result.current.keyboardHeight).toBe(320);
    expect(onKeyboardShow).toHaveBeenCalledTimes(1);
    expect(onKeyboardShow).toHaveBeenCalledWith(320);
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();

    triggerResize(900);
    expect(result.current.keyboardVisible).toBe(false);
    expect(result.current.keyboardHeight).toBe(0);
    expect(onKeyboardHide).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();

    unmount();
    expect(mockViewport.removeEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
    expect(mockViewport.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it("does not emit duplicate callbacks when viewport metrics are unchanged", () => {
    const onKeyboardShow = vi.fn();
    const onKeyboardHide = vi.fn();
    const { result } = renderHook(() =>
      useIOSKeyboard({ onKeyboardShow, onKeyboardHide }),
    );

    triggerResize(600);
    triggerResize(600);
    expect(onKeyboardShow).toHaveBeenCalledTimes(1);
    expect(result.current.keyboardVisible).toBe(true);
    expect(result.current.keyboardHeight).toBe(300);

    triggerResize(590);
    expect(onKeyboardShow).toHaveBeenCalledTimes(1);
    expect(result.current.keyboardHeight).toBe(310);

    triggerResize(900);
    triggerResize(900);
    expect(onKeyboardHide).toHaveBeenCalledTimes(1);
    expect(result.current.keyboardVisible).toBe(false);
    expect(result.current.keyboardHeight).toBe(0);
  });
});

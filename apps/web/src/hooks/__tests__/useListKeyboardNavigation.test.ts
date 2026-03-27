import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useListKeyboardNavigation } from "../useListKeyboardNavigation";

const createItems = () => [
  { id: "a", name: "Item A" },
  { id: "b", name: "Item B" },
  { id: "c", name: "Item C" },
];

// Helper to dispatch keyboard events with proper target
const dispatchKey = (key: string, target: HTMLElement = document.body) => {
  const event = new KeyboardEvent("keydown", { key, bubbles: true });
  Object.defineProperty(event, "target", {
    value: target,
    writable: false,
  });
  window.dispatchEvent(event);
};

describe("useListKeyboardNavigation", () => {
  const defaultOptions = {
    items: createItems(),
    onSelect: vi.fn(),
    getItemId: (item: { id: string }) => item.id,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with null selectedId", () => {
    const { result } = renderHook(() =>
      useListKeyboardNavigation(defaultOptions),
    );

    expect(result.current.selectedId).toBeNull();
    expect(typeof result.current.setSelectedId).toBe("function");
    expect(typeof result.current.clearSelection).toBe("function");
  });

  it("ArrowDown selects first item when nothing selected", () => {
    const { result } = renderHook(() =>
      useListKeyboardNavigation(defaultOptions),
    );

    act(() => {
      dispatchKey("ArrowDown");
    });

    expect(result.current.selectedId).toBe("a");
  });

  it("ArrowDown navigates sequentially through items", () => {
    const { result } = renderHook(() =>
      useListKeyboardNavigation(defaultOptions),
    );

    act(() => {
      dispatchKey("ArrowDown");
    });
    expect(result.current.selectedId).toBe("a");

    act(() => {
      dispatchKey("ArrowDown");
    });
    expect(result.current.selectedId).toBe("b");

    act(() => {
      dispatchKey("ArrowDown");
    });
    expect(result.current.selectedId).toBe("c");
  });

  it("ArrowDown stops at last item without loop", () => {
    const { result } = renderHook(() =>
      useListKeyboardNavigation(defaultOptions),
    );

    act(() => {
      result.current.setSelectedId("c");
    });

    act(() => {
      dispatchKey("ArrowDown");
    });

    expect(result.current.selectedId).toBe("c");
  });

  it("ArrowUp with loop wraps to last item", () => {
    const { result } = renderHook(() =>
      useListKeyboardNavigation({ ...defaultOptions, loop: true }),
    );

    act(() => {
      result.current.setSelectedId("a");
    });

    act(() => {
      dispatchKey("ArrowUp");
    });

    expect(result.current.selectedId).toBe("c");
  });

  it("Enter calls onSelect with current item", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useListKeyboardNavigation({ ...defaultOptions, onSelect }),
    );

    act(() => {
      result.current.setSelectedId("b");
    });

    act(() => {
      dispatchKey("Enter");
    });

    expect(onSelect).toHaveBeenCalledWith({ id: "b", name: "Item B" });
  });

  it("Enter does nothing when no item is selected", () => {
    const onSelect = vi.fn();
    renderHook(() =>
      useListKeyboardNavigation({ ...defaultOptions, onSelect }),
    );

    act(() => {
      dispatchKey("Enter");
    });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("Escape clears selection", () => {
    const { result } = renderHook(() =>
      useListKeyboardNavigation(defaultOptions),
    );

    act(() => {
      result.current.setSelectedId("b");
    });
    expect(result.current.selectedId).toBe("b");

    act(() => {
      dispatchKey("Escape");
    });

    expect(result.current.selectedId).toBeNull();
  });

  it("clearSelection resets selectedId to null", () => {
    const { result } = renderHook(() =>
      useListKeyboardNavigation(defaultOptions),
    );

    act(() => {
      result.current.setSelectedId("a");
    });
    expect(result.current.selectedId).toBe("a");

    act(() => {
      result.current.clearSelection();
    });
    expect(result.current.selectedId).toBeNull();
  });

  it("ignores keypresses when target is INPUT element", () => {
    const { result } = renderHook(() =>
      useListKeyboardNavigation(defaultOptions),
    );

    const input = document.createElement("input");
    document.body.appendChild(input);

    act(() => {
      dispatchKey("ArrowDown", input);
    });

    expect(result.current.selectedId).toBeNull();

    document.body.removeChild(input);
  });

  it("ignores keypresses when target is TEXTAREA element", () => {
    const { result } = renderHook(() =>
      useListKeyboardNavigation(defaultOptions),
    );

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    act(() => {
      dispatchKey("ArrowDown", textarea);
    });

    expect(result.current.selectedId).toBeNull();

    document.body.removeChild(textarea);
  });
});

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

  it("returns expected interface", () => {
    const { result } = renderHook(() =>
      useListKeyboardNavigation(defaultOptions),
    );

    expect(result.current).toHaveProperty("selectedId");
    expect(result.current).toHaveProperty("setSelectedId");
    expect(result.current).toHaveProperty("clearSelection");
    expect(result.current.selectedId).toBeNull();
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

  it("ArrowUp with loop wraps to last item", () => {
    const { result } = renderHook(() =>
      useListKeyboardNavigation({ ...defaultOptions, loop: true }),
    );

    // Start at first item
    act(() => {
      result.current.setSelectedId("a");
    });

    act(() => {
      dispatchKey("ArrowUp");
    });

    expect(result.current.selectedId).toBe("c"); // Wrapped to last
  });

  it("Enter calls onSelect with current item", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useListKeyboardNavigation({ ...defaultOptions, onSelect }),
    );

    // Select an item first
    act(() => {
      result.current.setSelectedId("b");
    });

    act(() => {
      dispatchKey("Enter");
    });

    expect(onSelect).toHaveBeenCalledWith({ id: "b", name: "Item B" });
  });

  it("ignores keypresses when in INPUT element", () => {
    const { result } = renderHook(() =>
      useListKeyboardNavigation(defaultOptions),
    );

    const input = document.createElement("input");
    document.body.appendChild(input);

    act(() => {
      dispatchKey("ArrowDown", input);
    });

    // Should not have selected anything
    expect(result.current.selectedId).toBeNull();

    document.body.removeChild(input);
  });
});

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useBulkSelection } from "../useBulkSelection";
import type { Id } from "@/convex/_generated/dataModel";

describe("useBulkSelection", () => {
  it("returns expected interface", () => {
    const { result } = renderHook(() => useBulkSelection());

    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.selectedCount).toBe(0);
    expect(typeof result.current.toggleSelection).toBe("function");
    expect(typeof result.current.selectAll).toBe("function");
    expect(typeof result.current.clearSelection).toBe("function");
    expect(typeof result.current.isSelected).toBe("function");
  });

  it("toggle adds and removes from selection", () => {
    const { result } = renderHook(() => useBulkSelection());

    const msgId = "msg-1" as Id<"messages">;

    // Add
    act(() => {
      result.current.toggleSelection(msgId);
    });
    expect(result.current.selectedIds).toContain(msgId);
    expect(result.current.selectedCount).toBe(1);

    // Remove
    act(() => {
      result.current.toggleSelection(msgId);
    });
    expect(result.current.selectedIds).not.toContain(msgId);
    expect(result.current.selectedCount).toBe(0);
  });

  it("selectAll replaces entire set", () => {
    const { result } = renderHook(() => useBulkSelection());

    const ids = ["msg-1", "msg-2", "msg-3"] as Id<"messages">[];

    act(() => {
      result.current.selectAll(ids);
    });

    expect(result.current.selectedIds).toHaveLength(3);
    expect(result.current.selectedCount).toBe(3);
  });

  it("isSelected checks membership", () => {
    const { result } = renderHook(() => useBulkSelection());

    const msgId = "msg-1" as Id<"messages">;
    const otherId = "msg-2" as Id<"messages">;

    act(() => {
      result.current.toggleSelection(msgId);
    });

    expect(result.current.isSelected(msgId)).toBe(true);
    expect(result.current.isSelected(otherId)).toBe(false);
  });
});

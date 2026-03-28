import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks
const { mockUpdateContent, mockDocument, mockHistory } = vi.hoisted(() => ({
  mockUpdateContent: vi.fn(),
  mockDocument: { current: null as { version: number } | null },
  mockHistory: {
    current: null as { version: number; content: string }[] | null,
  },
}));

// Import AFTER mocks
import { useCanvasHistory } from "../useCanvasHistory";

describe("useCanvasHistory", () => {
  const documentId = "doc-123" as string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocument.current = { version: 2 };
    mockHistory.current = [
      { version: 1, content: "v1 content" },
      { version: 2, content: "v2 content" },
      { version: 3, content: "v3 content" },
    ];
  });

  it("returns expected interface", () => {
    const { result } = renderHook(() => useCanvasHistory(documentId));

    expect(result.current).toHaveProperty("canUndo");
    expect(result.current).toHaveProperty("canRedo");
    expect(result.current).toHaveProperty("undo");
    expect(result.current).toHaveProperty("redo");
    expect(result.current).toHaveProperty("jumpToVersion");
    expect(result.current).toHaveProperty("currentVersion");
    expect(result.current).toHaveProperty("history");
  });

  it("canUndo false when currentVersion is 1", () => {
    mockDocument.current = { version: 1 };
    const { result } = renderHook(() => useCanvasHistory(documentId));

    expect(result.current.canUndo).toBe(false);
  });

  // Phase G: Canvas has no Postgres table yet. Document and history are stubs.
  // canUndo/canRedo/undo/redo/jumpToVersion rely on non-null document + history.
  // These tests verify the stubbed behavior until the table exists.

  it("canUndo false when document is null (Phase G stub)", () => {
    // document is null in the current implementation
    const { result } = renderHook(() => useCanvasHistory(documentId));

    expect(result.current.canUndo).toBe(false);
  });

  it("canRedo false when history is undefined (Phase G stub)", () => {
    const { result } = renderHook(() => useCanvasHistory(documentId));

    expect(result.current.canRedo).toBe(false);
  });

  it("undo is a no-op when document is null (Phase G stub)", async () => {
    const { result } = renderHook(() => useCanvasHistory(documentId));

    // Should not throw
    await result.current.undo();
  });

  it("redo is a no-op when history is undefined (Phase G stub)", async () => {
    const { result } = renderHook(() => useCanvasHistory(documentId));

    // Should not throw
    await result.current.redo();
  });

  it("jumpToVersion is a no-op when history is undefined (Phase G stub)", async () => {
    const { result } = renderHook(() => useCanvasHistory(documentId));

    // Should not throw
    await result.current.jumpToVersion(1);
  });

  it("returns undefined values when documentId is undefined", () => {
    const { result } = renderHook(() => useCanvasHistory(undefined));

    expect(result.current.currentVersion).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});

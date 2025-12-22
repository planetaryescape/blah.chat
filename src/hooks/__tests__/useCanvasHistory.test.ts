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

vi.mock("convex/react", () => ({
  useQuery: vi.fn((_queryFn, args) => {
    if (args === "skip") return undefined;
    // Determine which query based on args
    if ("limit" in args) return mockHistory.current;
    return mockDocument.current;
  }),
  useMutation: () => mockUpdateContent,
}));

// Import AFTER mocks
import type { Id } from "@/convex/_generated/dataModel";
import { useCanvasHistory } from "../useCanvasHistory";

describe("useCanvasHistory", () => {
  const documentId = "doc-123" as Id<"canvasDocuments">;

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

  it("canUndo true when currentVersion > 1", () => {
    mockDocument.current = { version: 2 };
    const { result } = renderHook(() => useCanvasHistory(documentId));

    expect(result.current.canUndo).toBe(true);
  });

  it("canRedo false when at latest version", () => {
    mockDocument.current = { version: 3 }; // Same as max in history
    const { result } = renderHook(() => useCanvasHistory(documentId));

    expect(result.current.canRedo).toBe(false);
  });

  it("canRedo true when not at latest version", () => {
    mockDocument.current = { version: 2 };
    const { result } = renderHook(() => useCanvasHistory(documentId));

    expect(result.current.canRedo).toBe(true);
  });

  it("undo calls mutation with previous version content", async () => {
    mockDocument.current = { version: 2 };
    const { result } = renderHook(() => useCanvasHistory(documentId));

    await result.current.undo();

    expect(mockUpdateContent).toHaveBeenCalledWith({
      documentId,
      content: "v1 content",
      source: "user_edit",
      diff: "Undo",
    });
  });

  it("redo calls mutation with next version content", async () => {
    mockDocument.current = { version: 2 };
    const { result } = renderHook(() => useCanvasHistory(documentId));

    await result.current.redo();

    expect(mockUpdateContent).toHaveBeenCalledWith({
      documentId,
      content: "v3 content",
      source: "user_edit",
      diff: "Redo",
    });
  });

  it("jumpToVersion restores specific version", async () => {
    const { result } = renderHook(() => useCanvasHistory(documentId));

    await result.current.jumpToVersion(1);

    expect(mockUpdateContent).toHaveBeenCalledWith({
      documentId,
      content: "v1 content",
      source: "user_edit",
      diff: "Restore v1",
    });
  });

  it("returns undefined values when documentId is undefined", () => {
    const { result } = renderHook(() => useCanvasHistory(undefined));

    expect(result.current.currentVersion).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});

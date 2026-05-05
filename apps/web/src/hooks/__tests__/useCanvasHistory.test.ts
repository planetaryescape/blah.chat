import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCanvasHistory } from "../useCanvasHistory";

interface FetchMockState {
  document: { _id: string; version: number; content: string } | null;
  history: Array<{
    _id: string;
    version: number;
    content: string;
    documentId: string;
    source: string;
    createdAt: number;
  }>;
}

const state: FetchMockState = {
  document: null,
  history: [],
};

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client, children });
}

beforeEach(() => {
  state.document = { _id: "doc-123", version: 2, content: "v2 content" };
  state.history = [
    {
      _id: "rev-1",
      version: 1,
      content: "v1 content",
      documentId: "doc-123",
      source: "user_edit",
      createdAt: 1,
    },
    {
      _id: "rev-2",
      version: 2,
      content: "v2 content",
      documentId: "doc-123",
      source: "user_edit",
      createdAt: 2,
    },
    {
      _id: "rev-3",
      version: 3,
      content: "v3 content",
      documentId: "doc-123",
      source: "user_edit",
      createdAt: 3,
    },
  ];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/history?order=asc&limit=200")) {
        return {
          ok: true,
          json: async () => ({ status: "success", data: state.history }),
        } as Response;
      }
      if (url.endsWith("/restore") && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({ status: "success" }),
        } as Response;
      }
      if (url.includes("/api/v1/documents/doc-123") && !init) {
        return {
          ok: true,
          json: async () => ({ status: "success", data: state.document }),
        } as Response;
      }
      // PATCH on document
      return {
        ok: true,
        json: async () => ({ status: "success" }),
      } as Response;
    }),
  );
});

describe("useCanvasHistory", () => {
  const documentId = "doc-123";

  it("returns the expected interface", async () => {
    const { result } = renderHook(() => useCanvasHistory(documentId), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.history).toBeDefined());

    expect(result.current).toHaveProperty("canUndo");
    expect(result.current).toHaveProperty("canRedo");
    expect(result.current).toHaveProperty("undo");
    expect(result.current).toHaveProperty("redo");
    expect(result.current).toHaveProperty("jumpToVersion");
    expect(result.current.currentVersion).toBe(2);
    expect(result.current.history).toHaveLength(3);
  });

  it("canUndo true when currentVersion > 1", async () => {
    const { result } = renderHook(() => useCanvasHistory(documentId), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.history).toHaveLength(3));
    expect(result.current.canUndo).toBe(true);
  });

  it("canUndo false when currentVersion is 1", async () => {
    state.document = { _id: "doc-123", version: 1, content: "v1" };
    const { result } = renderHook(() => useCanvasHistory(documentId), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.currentVersion).toBe(1));
    expect(result.current.canUndo).toBe(false);
  });

  it("canRedo true when current < latest", async () => {
    state.document = { _id: "doc-123", version: 2, content: "v2 content" };
    const { result } = renderHook(() => useCanvasHistory(documentId), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.latestVersion).toBe(3));
    expect(result.current.canRedo).toBe(true);
  });

  it("undo PATCHes with previous version content", async () => {
    const { result } = renderHook(() => useCanvasHistory(documentId), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.history).toHaveLength(3));

    await result.current.undo();

    const fetchCalls = vi.mocked(fetch).mock.calls;
    const patchCall = fetchCalls.find(
      ([_url, init]) => (init as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patchCall).toBeTruthy();
    const body = JSON.parse(String((patchCall![1] as RequestInit).body));
    expect(body.content).toBe("v1 content");
    expect(body.source).toBe("user_edit");
  });

  it("jumpToVersion uses /restore endpoint with revisionId", async () => {
    const { result } = renderHook(() => useCanvasHistory(documentId), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.history).toHaveLength(3));

    await result.current.jumpToVersion(1);

    const restoreCall = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => String(url).endsWith("/restore"));
    expect(restoreCall).toBeTruthy();
    const body = JSON.parse(String((restoreCall![1] as RequestInit).body));
    expect(body.revisionId).toBe("rev-1");
  });

  it("returns zeroed state when documentId is undefined", () => {
    const { result } = renderHook(() => useCanvasHistory(undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.currentVersion).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});

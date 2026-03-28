import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectNotes } from "../useProjectNotes";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useProjectNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          status: "success",
          data: [
            {
              sys: { entity: "note", id: "note_1" },
              data: {
                _id: "note_1",
                title: "Rewrite plan",
                content: "Move project notes to Postgres",
                tags: ["postgres"],
                isPinned: false,
                projectId: "project_1",
                createdAt: 100,
                updatedAt: 120,
              },
            },
          ],
        }),
      })),
    );
  });

  it("loads project notes from the Postgres REST route", async () => {
    const { result } = renderHook(() => useProjectNotes("project_1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/notes"),
        expect.objectContaining({ method: "GET" }),
      );
    });

    await waitFor(() => {
      expect(result.current.notes).toEqual([
        expect.objectContaining({
          _id: "note_1",
          title: "Rewrite plan",
          projectId: "project_1",
        }),
      ]);
    });
  });
});

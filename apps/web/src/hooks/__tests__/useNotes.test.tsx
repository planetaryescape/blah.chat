import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotes } from "../useNotes";

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

describe("useNotes", () => {
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
                title: "Global note",
                content: "On Postgres now",
                isPinned: false,
                createdAt: 100,
                updatedAt: 120,
              },
            },
          ],
        }),
      })),
    );
  });

  it("loads notes from the global Postgres REST route", async () => {
    const { result } = renderHook(() => useNotes(), {
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
          title: "Global note",
        }),
      ]);
    });
  });
});

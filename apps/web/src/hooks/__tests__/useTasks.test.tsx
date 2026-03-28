import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTasks } from "../useTasks";

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

describe("useTasks", () => {
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
              sys: { entity: "task", id: "task_1" },
              data: {
                _id: "task_1",
                title: "Global task",
                status: "in_progress",
                urgency: "medium",
                createdAt: 100,
                updatedAt: 120,
              },
            },
          ],
        }),
      })),
    );
  });

  it("loads tasks from the global Postgres REST route", async () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/tasks"),
        expect.objectContaining({ method: "GET" }),
      );
    });

    await waitFor(() => {
      expect(result.current.tasks).toEqual([
        expect.objectContaining({
          _id: "task_1",
          title: "Global task",
        }),
      ]);
    });
  });
});

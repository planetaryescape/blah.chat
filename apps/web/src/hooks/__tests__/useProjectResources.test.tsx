import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useKnowledgeSourcesMock = vi.fn();

vi.mock("../useKnowledgeSources", () => ({
  useKnowledgeSources: (...args: unknown[]) => useKnowledgeSourcesMock(...args),
}));

import { useProjectResources } from "../useProjectResources";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
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

describe("useProjectResources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: {
            items: [
              {
                status: "success",
                data: {
                  _id: "conv_1",
                  title: "Project Chat",
                  createdAt: 100,
                },
              },
            ],
          },
        }),
      })),
    );
    useKnowledgeSourcesMock.mockReturnValue({
      data: [
        {
          _id: "src_file",
          title: "Spec.pdf",
          type: "file",
          status: "completed",
          createdAt: 200,
        },
        {
          _id: "src_web",
          title: "Docs",
          type: "web",
          status: "completed",
          createdAt: 150,
        },
      ],
      isLoading: false,
    });
  });

  it("loads project conversations from REST and exposes only file knowledge sources for project files", async () => {
    const { result } = renderHook(() => useProjectResources("project_1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/conversations?projectId=project_1",
      );
    });

    await waitFor(() => {
      expect(result.current.conversations).toEqual([
        {
          _id: "conv_1",
          title: "Project Chat",
          createdAt: 100,
        },
      ]);
      expect(result.current.files).toEqual([
        {
          _id: "src_file",
          title: "Spec.pdf",
          type: "file",
          status: "completed",
          createdAt: 200,
        },
      ]);
    });
  });
});

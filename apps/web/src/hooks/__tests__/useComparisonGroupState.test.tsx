import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("@/lib/api/client", () => ({
  useApiClient: () => ({
    get: mockGet,
    post: mockPost,
  }),
}));

import {
  type ComparisonGroupState,
  shouldPollComparisonGroup,
  useComparisonGroupState,
} from "../useComparisonGroupState";

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

describe("useComparisonGroupState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("loads comparison state and stops the whole group through the request stop endpoint", async () => {
    mockGet.mockResolvedValue({
      comparisonGroupId: "cmp_1",
      status: "running",
      requestId: "req_1",
      sessionsByMessageId: {
        msg_1: {
          sessionId: "sess_1",
          modelId: "openai:gpt-5",
          status: "running",
        },
      },
      latestVote: null,
    });
    mockPost.mockResolvedValue({});

    const { result } = renderHook(() => useComparisonGroupState("cmp_1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.comparisonGroup?.comparisonGroupId).toBe("cmp_1"),
    );

    await act(async () => {
      await result.current.stopGroup();
    });

    expect(mockPost).toHaveBeenCalledWith("/api/v1/generations/req_1/stop");
  });

  it("stops a single comparison child session through the session stop endpoint", async () => {
    mockGet.mockResolvedValue({
      comparisonGroupId: "cmp_1",
      status: "running",
      requestId: "req_1",
      sessionsByMessageId: {
        msg_1: {
          sessionId: "sess_1",
          modelId: "openai:gpt-5",
          status: "running",
        },
      },
      latestVote: null,
    });
    mockPost.mockResolvedValue({});

    const { result } = renderHook(() => useComparisonGroupState("cmp_1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.comparisonGroup?.comparisonGroupId).toBe("cmp_1"),
    );

    await act(async () => {
      await result.current.stopSession("msg_1");
    });

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/generations/req_1/sessions/sess_1/stop",
    );
  });

  it("keeps polling when assistant snapshots are still blank after request completion", () => {
    expect(
      shouldPollComparisonGroup({
        comparisonGroupId: "cmp_1",
        conversationId: "conv_1",
        userMessageId: "user_1",
        status: "complete",
        requestId: null,
        assistantMessagesById: {
          msg_1: {
            status: "complete",
            model: "openai:gpt-5",
          },
        },
        sessionsByMessageId: {
          msg_1: {
            sessionId: "sess_1",
            modelId: "openai:gpt-5",
            status: "complete",
          },
        },
        latestVote: null,
      }),
    ).toBe(true);

    expect(
      shouldPollComparisonGroup({
        comparisonGroupId: "cmp_1",
        conversationId: "conv_1",
        userMessageId: "user_1",
        status: "complete",
        requestId: null,
        assistantMessagesById: {
          msg_1: {
            content: "Hydrated answer",
            status: "complete",
            model: "openai:gpt-5",
          },
        },
        sessionsByMessageId: {
          msg_1: {
            sessionId: "sess_1",
            modelId: "openai:gpt-5",
            status: "complete",
          },
        },
        latestVote: null,
      }),
    ).toBe(false);
  });

  it("handles stale comparison payloads that are missing assistant snapshot maps", () => {
    expect(
      shouldPollComparisonGroup({
        comparisonGroupId: "cmp_1",
        conversationId: "conv_1",
        userMessageId: "user_1",
        status: "running",
        requestId: null,
        sessionsByMessageId: {
          msg_1: {
            sessionId: "sess_1",
            modelId: "openai:gpt-5",
            status: "complete",
          },
        },
        latestVote: null,
      } as unknown as ComparisonGroupState),
    ).toBe(true);
  });
});

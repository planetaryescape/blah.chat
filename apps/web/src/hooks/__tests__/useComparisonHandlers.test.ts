import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const mockPost = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/lib/api/client", () => ({
  useApiClient: () => ({
    post: mockPost,
  }),
}));

import { useComparisonHandlers } from "../useComparisonHandlers";

describe("useComparisonHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts votes to the REST comparison endpoint", async () => {
    mockPost.mockResolvedValueOnce({});
    const { result } = renderHook(() =>
      useComparisonHandlers({
        conversationId: "conv_1",
        messages: [
          {
            _id: "msg_1",
            conversationId: "conv_1" as any,
            role: "assistant",
            content: "A",
            status: "complete",
            comparisonGroupId: "cmp_1",
            createdAt: 1,
            updatedAt: 1,
            _creationTime: 1,
          } as any,
        ],
      }),
    );

    await act(async () => {
      await result.current.handleVote("msg_1", "left_better");
    });

    expect(mockPost).toHaveBeenCalledWith("/api/v1/comparisons/cmp_1/vote", {
      winnerMessageId: "msg_1",
      rating: "left_better",
    });
  });

  it("navigates after creating a new-chat consolidation", async () => {
    mockPost.mockResolvedValueOnce({
      conversationId: "conv_new",
    });
    const { result } = renderHook(() =>
      useComparisonHandlers({
        conversationId: "conv_1",
        messages: [
          {
            _id: "msg_1",
            conversationId: "conv_1" as any,
            role: "assistant",
            content: "A",
            status: "complete",
            comparisonGroupId: "cmp_1",
            createdAt: 1,
            updatedAt: 1,
            _creationTime: 1,
          } as any,
        ],
      }),
    );

    await act(async () => {
      await result.current.handleConsolidate("openai:gpt-5", "new-chat");
    });

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/comparisons/cmp_1/consolidate",
      {
        consolidationModel: "openai:gpt-5",
        mode: "new-chat",
      },
    );
    expect(mockPush).toHaveBeenCalledWith("/chat/conv_new");
  });
});

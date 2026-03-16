import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPatch = vi.fn();

vi.mock("@/lib/api/client", () => ({
  useApiClient: () => ({
    patch: mockPatch,
  }),
}));

import { useChatModelSelection } from "../useChatModelSelection";

describe("useChatModelSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists model changes through the REST conversation route", async () => {
    mockPatch.mockResolvedValueOnce({});
    const { result } = renderHook(() =>
      useChatModelSelection({
        conversationId: "conv_1" as any,
        conversation: {
          _id: "conv_1",
          model: "openai:gpt-5-mini",
        } as any,
        user: { _id: "user_1" } as any,
        defaultModel: "openai:gpt-5-mini",
      }),
    );

    await act(async () => {
      await result.current.handleModelChange("openai:gpt-5");
    });

    expect(mockPatch).toHaveBeenCalledWith("/api/v1/conversations/conv_1", {
      model: "openai:gpt-5",
    });
  });
});

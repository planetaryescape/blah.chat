import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { delegatedHandlers, useComparisonHandlersMock } = vi.hoisted(() => ({
  delegatedHandlers: {
    handleVote: vi.fn(),
    handleConsolidate: vi.fn(),
  },
  useComparisonHandlersMock: vi.fn(),
}));

useComparisonHandlersMock.mockImplementation(() => delegatedHandlers);

vi.mock("../useComparisonHandlers", () => ({
  useComparisonHandlers: useComparisonHandlersMock,
}));

import { useChatComparison } from "../useChatComparison";

describe("useChatComparison", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to the REST-backed comparison handlers hook", () => {
    const messages = [{ _id: "msg_1", comparisonGroupId: "cmp_1" }];

    const { result } = renderHook(() =>
      useChatComparison({
        conversationId: "conv_1",
        messages,
      }),
    );

    expect(useComparisonHandlersMock).toHaveBeenCalledWith({
      conversationId: "conv_1",
      messages,
    });
    expect(result.current).toBe(delegatedHandlers);
  });
});

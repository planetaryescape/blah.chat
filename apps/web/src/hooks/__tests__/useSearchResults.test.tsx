import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchMessagesMock = vi.fn();

vi.mock("@/lib/api/sdkClient", () => ({
  useSDKClient: () => ({
    searchMessages: searchMessagesMock,
  }),
}));

import { useSearchResults } from "../useSearchResults";

describe("useSearchResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searches via the REST SDK and returns Postgres-backed search messages", async () => {
    searchMessagesMock.mockResolvedValue([
      {
        _id: "msg_1",
        conversationId: "conv_1",
        conversationTitle: "Search Chat",
        role: "user",
        content: "solar eclipse facts",
      },
    ]);

    const { result } = renderHook(() =>
      useSearchResults(
        "  solar eclipse  ",
        {
          conversation: "conv_1",
          from: 100,
          to: 200,
          type: "user",
        },
        1,
      ),
    );

    await waitFor(() => {
      expect(searchMessagesMock).toHaveBeenCalledWith({
        query: "solar eclipse",
        limit: 20,
        conversationId: "conv_1",
        dateFrom: 100,
        dateTo: 200,
        messageType: "user",
      });
    });

    await waitFor(() => {
      expect(result.current.results).toEqual([
        {
          _id: "msg_1",
          conversationId: "conv_1",
          conversationTitle: "Search Chat",
          role: "user",
          content: "solar eclipse facts",
        },
      ]);
    });
    expect(result.current.hasMore).toBe(false);
  });
});

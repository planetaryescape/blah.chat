import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockBulkPut, mockConversationPut } = vi.hoisted(() => ({
  mockBulkPut: vi.fn(),
  mockConversationPut: vi.fn(),
}));

vi.mock("@/lib/cache", () => ({
  cache: {
    conversations: {
      put: mockConversationPut,
    },
    messages: {
      bulkPut: mockBulkPut,
    },
  },
}));

import { ConversationPrefetcher } from "../ConversationPrefetcher";

describe("ConversationPrefetcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/api/v1/conversations/conv_1")) {
          return {
            ok: true,
            json: async () => ({
              data: {
                _id: "conv_1",
                title: "Prefetched chat",
              },
            }),
          };
        }

        return {
          ok: true,
          json: async () => [
            {
              data: {
                _id: "msg_1",
                conversationId: "conv_1",
                content: "Prefetched message",
              },
            },
          ],
        };
      }),
    );
  });

  it("warms the local cache through REST routes", async () => {
    render(<ConversationPrefetcher conversationId={"conv_1" as string} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/conversations/conv_1",
        expect.objectContaining({
          credentials: "include",
          headers: { Accept: "application/json" },
        }),
      );
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/conversations/conv_1/messages",
        expect.objectContaining({
          credentials: "include",
          headers: { Accept: "application/json" },
        }),
      );
    });

    await waitFor(() => {
      expect(mockConversationPut).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "conv_1" }),
      );
      expect(mockBulkPut).toHaveBeenCalledWith([
        expect.objectContaining({ _id: "msg_1", conversationId: "conv_1" }),
      ]);
    });
  });
});

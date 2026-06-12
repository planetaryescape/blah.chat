import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrefetchConversation, mockPrefetchMessages } = vi.hoisted(() => ({
  mockPrefetchConversation: vi.fn(async () => {}),
  mockPrefetchMessages: vi.fn(async () => {}),
}));

vi.mock("@/lib/cache", () => ({
  prefetchConversationIntoCache: mockPrefetchConversation,
  prefetchMessagesIntoCache: mockPrefetchMessages,
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

  it("warms the local cache through guarded prefetch writes", async () => {
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
      expect(mockPrefetchConversation).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "conv_1" }),
      );
      expect(mockPrefetchMessages).toHaveBeenCalledWith([
        expect.objectContaining({ _id: "msg_1", conversationId: "conv_1" }),
      ]);
    });
  });

  it("skips the currently open conversation", async () => {
    // setup.ts mocks useParams to return { conversationId: "test-id" }.
    render(<ConversationPrefetcher conversationId={"test-id" as string} />);

    // Give any (incorrect) prefetch a chance to fire.
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(fetch).not.toHaveBeenCalled();
    expect(mockPrefetchConversation).not.toHaveBeenCalled();
    expect(mockPrefetchMessages).not.toHaveBeenCalled();
  });
});

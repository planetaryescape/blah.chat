import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listConversationsMock = vi.fn();
const listMessagesMock = vi.fn();

vi.mock("@/lib/api/sdkClient", () => ({
  useSDKClient: () => ({
    listConversations: listConversationsMock,
    listMessages: listMessagesMock,
  }),
}));

import { useConversations } from "../useConversations";
import { useMessages } from "../useMessages";

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

describe("transport chat query hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads conversations through the REST SDK", async () => {
    listConversationsMock.mockResolvedValue({
      items: [{ _id: "conv_1", title: "REST Conversation" }],
      total: 1,
    });

    const { result } = renderHook(
      () => useConversations({ pageSize: 25, archived: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(listConversationsMock).toHaveBeenCalledWith({
        limit: 25,
        archived: true,
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        items: [{ _id: "conv_1", title: "REST Conversation" }],
        pagination: {
          page: 1,
          pageSize: 1,
          total: 1,
          hasNext: false,
        },
      });
    });
  });

  it("loads messages through the REST SDK", async () => {
    listMessagesMock.mockResolvedValue([
      {
        _id: "msg_1",
        conversationId: "conv_1",
        role: "user",
        content: "REST message",
      },
    ]);

    const { result } = renderHook(
      () => useMessages({ conversationId: "conv_1" as any, pageSize: 50 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(listMessagesMock).toHaveBeenCalledWith("conv_1");
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        items: [
          {
            _id: "msg_1",
            conversationId: "conv_1",
            role: "user",
            content: "REST message",
          },
        ],
        pagination: {
          page: 1,
          pageSize: 1,
          total: 1,
          hasNext: false,
        },
      });
    });
  });
});

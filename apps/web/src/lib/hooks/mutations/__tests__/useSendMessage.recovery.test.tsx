/**
 * @vitest-environment jsdom
 */
import "fake-indexeddb/auto";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  useApiClient: () => transport,
}));
vi.mock("convex/react", () => ({
  useQuery: () => ({ _id: "user-recovery-test" }),
}));
vi.mock("@/lib/analytics", () => ({ analytics: { track: vi.fn() } }));
vi.mock("sonner", () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { BlahChatCache, setActiveCache } from "@/lib/cache/db";
import { messageQueue } from "@/lib/offline/messageQueue";
import { useSendMessage } from "../useSendMessage";

describe("useSendMessage durable recovery", () => {
  let cache: BlahChatCache;
  let queryClient: QueryClient;
  let conversationId: Id<"conversations">;

  beforeEach(async () => {
    vi.clearAllMocks();
    cache = new BlahChatCache(`recovery-${crypto.randomUUID()}`);
    await cache.open();
    setActiveCache(cache);
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });
    conversationId = "conversation-recovery" as Id<"conversations">;
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
  });

  afterEach(async () => {
    setActiveCache(null);
    queryClient.clear();
    cache.close();
    await cache.delete();
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it("persists complete intent before transport and recovers it after remount with the same key", async () => {
    let durableBeforeFirstRequest = false;
    transport.post
      .mockImplementationOnce(
        async (_url: string, request: Record<string, unknown>) => {
          const rows = await cache.pendingMutations.toArray();
          durableBeforeFirstRequest = rows.some(
            (row) =>
              row.type === "sendMessageV2" &&
              (row.payload as Record<string, unknown>).clientMessageId ===
                request.clientMessageId,
          );
          throw new Error("response lost after server acceptance");
        },
      )
      .mockResolvedValueOnce({
        conversationId: "conversation-recovery",
        messageId: "accepted-user-message",
        assistantMessageId: "accepted-assistant-message",
      });

    const first = renderHook(
      () => useSendMessage(undefined, conversationId, false),
      { wrapper },
    );
    const intent = {
      conversationId,
      content: "Recover this after acknowledgement loss",
      models: ["model-a", "model-b"],
      thinkingEffort: "high" as const,
      clientMessageId: "request-survives-remount",
      attachments: [
        {
          type: "image" as const,
          name: "evidence.png",
          storageId: "storage-evidence",
          mimeType: "image/png",
          size: 64,
        },
      ],
    };

    await expect(first.result.current.mutateAsync(intent)).rejects.toThrow(
      "response lost after server acceptance",
    );
    expect(durableBeforeFirstRequest).toBe(true);
    expect(await cache.pendingMutations.toArray()).toMatchObject([
      {
        type: "sendMessageV2",
        payload: {
          clientMessageId: intent.clientMessageId,
          content: intent.content,
          models: intent.models,
          thinkingEffort: "high",
          attachments: intent.attachments,
        },
      },
    ]);
    expect(
      await cache.pendingMutations.where("type").equals("sendMessage").count(),
    ).toBe(0);
    expect(await messageQueue.getCount(cache)).toBe(1);
    first.unmount();

    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });
    const recovered = renderHook(
      () => useSendMessage(undefined, conversationId, false),
      { wrapper },
    );
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(() => expect(transport.post).toHaveBeenCalledTimes(2));
    await waitFor(async () => {
      expect(await cache.pendingMutations.toArray()).toHaveLength(0);
    });
    expect(transport.post.mock.calls[1]?.[1]).toMatchObject({
      clientMessageId: intent.clientMessageId,
      content: intent.content,
      models: intent.models,
      thinkingEffort: "high",
      attachments: intent.attachments,
    });
    recovered.unmount();
  });
});

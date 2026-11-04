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
    transport.post.mockReset();
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
    const optimisticUpdate = vi.fn();
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
      () => useSendMessage(optimisticUpdate, conversationId, false),
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
      () => useSendMessage(optimisticUpdate, conversationId, false),
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
    expect(optimisticUpdate).toHaveBeenCalledOnce();
    recovered.unmount();
  });

  it("snapshots intent before persistence and transport can observe caller mutations", async () => {
    transport.post.mockResolvedValue({
      conversationId: "conversation-recovery",
      messageId: "accepted-user",
      assistantMessageId: "accepted-assistant",
    });
    const hook = renderHook(
      () => useSendMessage(undefined, conversationId, false),
      { wrapper },
    );
    const intent = {
      conversationId,
      content: "captured content",
      models: ["model-a", "model-b"],
      thinkingEffort: "high" as const,
      clientMessageId: "captured-request",
      attachments: [
        {
          type: "image" as const,
          name: "captured.png",
          storageId: "captured-storage",
          mimeType: "image/png",
          size: 42,
        },
      ],
    };

    const sending = hook.result.current.mutateAsync(intent);
    intent.content = "mutated content";
    intent.models.reverse();
    intent.attachments[0]!.name = "mutated.png";
    await sending;

    expect(transport.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        content: "captured content",
        models: ["model-a", "model-b"],
        thinkingEffort: "high",
        clientMessageId: "captured-request",
        attachments: [
          expect.objectContaining({ name: "captured.png", size: 42 }),
        ],
      }),
    );
    hook.unmount();
  });

  it("keeps the durable request when acceptance IDs identify another target", async () => {
    transport.post.mockResolvedValue({
      conversationId: "different-conversation",
      messageId: "accepted-user",
      assistantMessageId: "accepted-assistant",
    });
    const hook = renderHook(
      () => useSendMessage(undefined, conversationId, false),
      { wrapper },
    );

    await expect(
      hook.result.current.mutateAsync({
        conversationId,
        content: "do not acknowledge a different target",
        clientMessageId: "target-validation-key",
      }),
    ).rejects.toThrow("The send response did not confirm acceptance");
    expect(await cache.pendingMutations.toArray()).toMatchObject([
      {
        type: "sendMessageV2",
        payload: {
          clientMessageId: "target-validation-key",
          conversationId,
        },
      },
    ]);
    hook.unmount();
  });

  it("does not acknowledge or invalidate into a different active owner cache", async () => {
    let accept!: (value: unknown) => void;
    transport.post.mockImplementationOnce(
      () => new Promise((resolve) => (accept = resolve)),
    );
    const hook = renderHook(
      () => useSendMessage(undefined, conversationId, false),
      { wrapper },
    );
    const invalidation = vi.spyOn(queryClient, "invalidateQueries");
    const sending = hook.result.current.mutateAsync({
      conversationId,
      content: "owner-fenced request",
      clientMessageId: "owner-fenced-key",
    });
    await waitFor(() => expect(transport.post).toHaveBeenCalledOnce());
    const otherCache = new BlahChatCache(`other-owner-${crypto.randomUUID()}`);
    await otherCache.open();
    setActiveCache(otherCache);
    await act(async () => {
      accept({
        conversationId: "conversation-recovery",
        messageId: "accepted-user",
        assistantMessageId: "accepted-assistant",
      });
      await sending;
    });

    expect(await cache.pendingMutations.toArray()).toHaveLength(1);
    expect(invalidation).not.toHaveBeenCalled();
    setActiveCache(cache);
    otherCache.close();
    await otherCache.delete();
    hook.unmount();
  });

  it("rechecks owner identity after asynchronous acknowledgement", async () => {
    const otherCache = new BlahChatCache(`ack-owner-${crypto.randomUUID()}`);
    await otherCache.open();
    transport.post.mockResolvedValue({
      conversationId: "conversation-recovery",
      messageId: "accepted-user",
      assistantMessageId: "accepted-assistant",
    });
    const acknowledge = vi
      .spyOn(messageQueue, "acknowledgeReplayable")
      .mockImplementationOnce(async () => {
        setActiveCache(otherCache);
        return false;
      });
    const invalidation = vi.spyOn(queryClient, "invalidateQueries");
    const hook = renderHook(
      () => useSendMessage(undefined, conversationId, false),
      { wrapper },
    );

    await hook.result.current.mutateAsync({
      conversationId,
      content: "identity changes during acknowledgement",
      clientMessageId: "ack-owner-fence-key",
    });

    expect(acknowledge).toHaveBeenCalledOnce();
    expect(invalidation).not.toHaveBeenCalled();
    expect(await cache.pendingMutations.toArray()).toHaveLength(1);
    setActiveCache(cache);
    acknowledge.mockRestore();
    otherCache.close();
    await otherCache.delete();
    hook.unmount();
  });

  it("does not let an old online callback process the next owner's outbox", async () => {
    const hook = renderHook(
      () => useSendMessage(undefined, conversationId, false),
      { wrapper },
    );
    const otherCache = new BlahChatCache(`online-owner-${crypto.randomUUID()}`);
    await otherCache.open();
    try {
      setActiveCache(otherCache);
      await messageQueue.enqueueReplayable(
        {
          conversationId,
          content: "belongs to the next owner",
          clientMessageId: "next-owner-key",
        },
        otherCache,
      );
      const before = await otherCache.pendingMutations.toArray();
      transport.post.mockResolvedValue({
        conversationId,
        messageId: "other-owner-message",
        assistantMessageId: "other-owner-assistant",
      });
      await act(async () => {
        window.dispatchEvent(new Event("online"));
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
      expect(transport.post).not.toHaveBeenCalled();
      expect(await otherCache.pendingMutations.toArray()).toEqual(before);
    } finally {
      hook.unmount();
      setActiveCache(cache);
      otherCache.close();
      await otherCache.delete();
    }
  });

  it("does not let a stale mutate callback persist a send into the next owner's cache", async () => {
    const hook = renderHook(
      () => useSendMessage(undefined, conversationId, false),
      { wrapper },
    );
    const oldMutate = hook.result.current.mutateAsync;
    const otherCache = new BlahChatCache(`mutate-owner-${crypto.randomUUID()}`);
    await otherCache.open();
    try {
      setActiveCache(otherCache);
      await act(async () => {
        await expect(
          oldMutate({
            conversationId,
            content: "stale caller",
            clientMessageId: "stale-owner-key",
          }),
        ).rejects.toThrow(/account|cache/i);
      });
      expect(transport.post).not.toHaveBeenCalled();
      expect(await otherCache.pendingMutations.toArray()).toHaveLength(0);
    } finally {
      hook.unmount();
      setActiveCache(cache);
      otherCache.close();
      await otherCache.delete();
    }
  });
});

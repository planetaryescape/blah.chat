import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Store mutation config to call lifecycle methods
let mutationConfig: null | {
  mutationFn?: (args: unknown) => Promise<unknown>;
  onMutate?: (variables: unknown) => unknown;
  onSuccess?: (data: unknown, variables: unknown, context?: unknown) => unknown;
  onError?: (
    error: Error,
    variables: unknown,
    context: unknown,
  ) => Promise<void>;
} = null;

// Store mock functions for assertions
let mockPost: ReturnType<typeof vi.fn>;
let mockInvalidateQueries: ReturnType<typeof vi.fn>;

// Create mocks inline in vi.mock factories - no external variable references
vi.mock("@tanstack/react-query", () => {
  const invalidate = vi.fn();
  return {
    useMutation: vi.fn((config: typeof mutationConfig) => {
      mutationConfig = config;
      return {
        mutate: vi.fn(),
        mutateAsync: config?.mutationFn,
        isPending: false,
      };
    }),
    useQueryClient: () => {
      mockInvalidateQueries = invalidate;
      return {
        invalidateQueries: invalidate,
      };
    },
  };
});

vi.mock("convex/react", () => ({
  useQuery: () => ({ _id: "user-123", name: "Test User" }),
}));

vi.mock("@/lib/api/client", () => {
  const post = vi.fn().mockResolvedValue({
    conversationId: "conv-123",
    messageId: "message-1",
    assistantMessageId: "assistant-1",
  });
  return {
    useApiClient: () => {
      mockPost = post;
      return { post };
    },
  };
});

vi.mock("@/lib/offline/messageQueue", () => ({
  messageQueue: {
    enqueue: vi.fn(async () => true),
    enqueueReplayable: vi.fn(async (payload) => ({
      ...payload,
      id: "queued-1",
      timestamp: Date.now(),
      retries: 0,
    })),
    acknowledgeReplayable: vi.fn(async () => true),
    processReplayableQueue: vi.fn(async () => "complete"),
    retryAttention: vi.fn(),
    getCount: vi.fn(() => 0),
    processQueue: vi.fn(),
  },
  isDefinitiveRefusal: (error: unknown) =>
    !!error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500,
}));

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/analytics", () => ({
  analytics: { track: vi.fn() },
}));

vi.mock("@/lib/query/keys", () => ({
  queryKeys: {
    messages: {
      list: (id: string) => ["messages", id],
    },
  },
}));

// Import AFTER mocks
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { toast } from "sonner";
import { BlahChatCache, setActiveCache } from "@/lib/cache/db";
import { messageQueue } from "@/lib/offline/messageQueue";
import { useSendMessage } from "../useSendMessage";

// Cast to get mock functions for assertions
const mockToast = vi.mocked(toast);
const mockMessageQueue = vi.mocked(messageQueue);

describe("useSendMessage", () => {
  const conversationId = "conv-123" as Id<"conversations">;

  beforeEach(() => {
    vi.clearAllMocks();
    mutationConfig = null;
    setActiveCache(new BlahChatCache("test-owner"));
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  it("returns mutate function and isPending state", () => {
    const { result } = renderHook(() => useSendMessage());

    expect(result.current).toHaveProperty("mutate");
    expect(result.current).toHaveProperty("isPending");
    expect(typeof result.current.mutate).toBe("function");
  });

  it("creates optimistic user message on mutate", async () => {
    const onOptimisticUpdate = vi.fn();
    renderHook(() => useSendMessage(onOptimisticUpdate, conversationId, false));

    // Call onMutate to trigger optimistic update
    await mutationConfig?.onMutate?.({
      conversationId,
      content: "Hello world",
      modelId: "openai:gpt-4o",
      clientMessageId: "client-stable",
    });

    expect(onOptimisticUpdate).toHaveBeenCalled();
    const [[messages]] = onOptimisticUpdate.mock.calls;

    // First message should be user message
    expect(messages[0]).toMatchObject({
      role: "user",
      content: "Hello world",
      _optimistic: true,
    });
    expect(messages[0]._id).toMatch(/^temp-user-/);
    expect(messages[0].clientMessageId).toBe("client-stable");
  });

  it("creates only user message for model comparison (server creates assistants)", async () => {
    const onOptimisticUpdate = vi.fn();
    renderHook(() => useSendMessage(onOptimisticUpdate, conversationId, false));

    await mutationConfig?.onMutate?.({
      conversationId,
      content: "Compare these",
      models: ["openai:gpt-4o", "anthropic:claude-3-opus"],
      clientMessageId: "client-compare",
    });

    expect(onOptimisticUpdate).toHaveBeenCalled();
    const [[messages]] = onOptimisticUpdate.mock.calls;

    // Only user message - server creates assistant messages synchronously
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe("Compare these");
  });

  it("keeps incognito sends out of the durable replay outbox", async () => {
    renderHook(() => useSendMessage(undefined, conversationId, true));
    const args = {
      conversationId,
      content: "Private message",
      modelId: "openai:gpt-4o",
      clientMessageId: "private-request-key",
    };
    await mutationConfig?.onMutate?.(args);
    await mutationConfig?.mutationFn?.(args);

    expect(mockMessageQueue.enqueueReplayable).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith(
      `/api/v1/conversations/${conversationId}/messages`,
      args,
    );
  });

  it("calls API client post with correct payload", async () => {
    renderHook(() => useSendMessage(undefined, conversationId, false));

    const args = {
      conversationId,
      content: "Test message",
      modelId: "openai:gpt-4o",
      clientMessageId: "client-fixed-id",
    };

    const context = await mutationConfig?.onMutate?.(args);
    await mutationConfig?.mutationFn?.(args);
    await mutationConfig?.onSuccess?.(
      { conversationId: "conv-123", messageId: "m1", assistantMessageId: "a1" },
      args,
      context,
    );

    expect(mockPost).toHaveBeenCalledWith(
      `/api/v1/conversations/${conversationId}/messages`,
      args,
    );
  });

  it("invalidates conversations query on success", () => {
    renderHook(() => useSendMessage(undefined, conversationId, false));

    mutationConfig?.onSuccess?.(
      {
        status: "success",
        data: {
          conversationId: "conv-123",
          messageId: "m1",
          assistantMessageId: "a1",
        },
      },
      { conversationId, content: "Test" },
    );

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["messages", conversationId],
    });
  });

  it("shows queued outcome when online and transport fails", async () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });

    renderHook(() => useSendMessage(undefined, conversationId, false));

    const args = {
      conversationId,
      content: "Test",
      clientMessageId: "client-network-failure",
    };
    const context = await mutationConfig?.onMutate?.(args);
    const error = new Error("Network error");
    mutationConfig?.onError?.(error, args, context);

    expect(mockToast.info).toHaveBeenCalled();
    expect(mockMessageQueue.acknowledgeReplayable).not.toHaveBeenCalled();
  });

  it("enqueues message when offline", async () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });

    renderHook(() => useSendMessage(undefined, conversationId, false));

    const args = {
      conversationId,
      content: "Offline message",
      modelId: "openai:gpt-4o",
      clientMessageId: "offline-stable",
    };

    const context = await mutationConfig?.onMutate?.(args);
    await mutationConfig?.onError?.(new Error("Failed"), args, context);

    expect(mockMessageQueue.enqueueReplayable).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId,
        content: "Offline message",
        modelId: "openai:gpt-4o",
        clientMessageId: "offline-stable",
      }),
      expect.any(BlahChatCache),
    );
  });

  it.each([
    "cancelled",
    "incomplete",
  ] as const)("does not toast success when processing is %s", async (status) => {
    mockMessageQueue.getCount.mockResolvedValue(1);
    mockMessageQueue.processQueue.mockResolvedValue(status);
    mockMessageQueue.processReplayableQueue.mockResolvedValue(status);
    renderHook(() => useSendMessage(undefined, conversationId, false));
    window.dispatchEvent(new Event("online"));
    await vi.waitFor(() =>
      expect(mockMessageQueue.processQueue).toHaveBeenCalled(),
    );
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("handles operational queue errors without an unhandled rejection", async () => {
    mockMessageQueue.getCount.mockResolvedValue(1);
    mockMessageQueue.processQueue.mockRejectedValue(
      new Error("storage failed"),
    );
    renderHook(() => useSendMessage(undefined, conversationId, false));
    window.dispatchEvent(new Event("online"));
    await vi.waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        "Failed to process queued messages",
      ),
    );
    expect(mockToast.success).not.toHaveBeenCalled();
  });
});

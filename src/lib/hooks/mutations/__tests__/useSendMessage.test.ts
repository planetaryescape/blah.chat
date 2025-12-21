import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Store mutation config to call lifecycle methods
let mutationConfig: null | {
  mutationFn?: (args: unknown) => Promise<unknown>;
  onMutate?: (variables: unknown) => unknown;
  onSuccess?: (data: unknown, variables: unknown) => void;
  onError?: (error: Error, variables: unknown, context: unknown) => void;
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
  const post = vi.fn().mockResolvedValue({ status: "success", data: {} });
  return {
    useApiClient: () => {
      mockPost = post;
      return { post };
    },
  };
});

vi.mock("@/lib/offline/messageQueue", () => ({
  messageQueue: {
    enqueue: vi.fn(),
    getCount: vi.fn(() => 0),
    processQueue: vi.fn(),
  },
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
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
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
    renderHook(() => useSendMessage(onOptimisticUpdate));

    // Call onMutate to trigger optimistic update
    await mutationConfig?.onMutate?.({
      conversationId,
      content: "Hello world",
      modelId: "openai:gpt-4o",
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
  });

  it("creates optimistic assistant message(s) for model array", async () => {
    const onOptimisticUpdate = vi.fn();
    renderHook(() => useSendMessage(onOptimisticUpdate));

    await mutationConfig?.onMutate?.({
      conversationId,
      content: "Compare these",
      models: ["openai:gpt-4o", "anthropic:claude-3-opus"],
    });

    expect(onOptimisticUpdate).toHaveBeenCalled();
    const [[messages]] = onOptimisticUpdate.mock.calls;

    // Should have 1 user + 2 assistant messages
    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");
    expect(messages[1].model).toBe("openai:gpt-4o");
    expect(messages[2].role).toBe("assistant");
    expect(messages[2].model).toBe("anthropic:claude-3-opus");

    // Both assistant messages should have comparisonGroupId
    expect(messages[1].comparisonGroupId).toBeDefined();
    expect(messages[2].comparisonGroupId).toBe(messages[1].comparisonGroupId);
  });

  it("calls API client post with correct payload", async () => {
    renderHook(() => useSendMessage());

    const args = {
      conversationId,
      content: "Test message",
      modelId: "openai:gpt-4o",
    };

    await mutationConfig?.mutationFn?.(args);

    expect(mockPost).toHaveBeenCalledWith(
      `/api/v1/conversations/${conversationId}/messages`,
      args,
    );
  });

  it("invalidates conversations query on success", () => {
    renderHook(() => useSendMessage());

    mutationConfig?.onSuccess?.(
      { status: "success" },
      { conversationId, content: "Test" },
    );

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["messages", conversationId],
    });
  });

  it("shows error toast when online and fails", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });

    renderHook(() => useSendMessage());

    const error = new Error("Network error");
    mutationConfig?.onError?.(
      error,
      { conversationId, content: "Test" },
      undefined,
    );

    expect(mockToast.error).toHaveBeenCalledWith("Network error");
    expect(mockMessageQueue.enqueue).not.toHaveBeenCalled();
  });

  it("enqueues message when offline", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });

    renderHook(() => useSendMessage());

    const args = {
      conversationId,
      content: "Offline message",
      modelId: "openai:gpt-4o",
    };

    mutationConfig?.onError?.(new Error("Failed"), args, undefined);

    expect(mockMessageQueue.enqueue).toHaveBeenCalledWith({
      conversationId,
      content: "Offline message",
      modelId: "openai:gpt-4o",
      models: undefined,
      attachments: undefined,
    });
    expect(mockToast.info).toHaveBeenCalledWith(
      "You're offline. Message queued and will send when reconnected.",
    );
  });
});

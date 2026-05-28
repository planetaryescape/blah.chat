import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mutationConfig: null | {
  mutationFn?: (args: unknown) => Promise<unknown>;
  onSuccess?: (data: unknown, variables: unknown) => void;
} = null;

const { mockInvalidateQueries, mockPlayNotificationChime, mockPost } =
  vi.hoisted(() => ({
    mockInvalidateQueries: vi.fn(),
    mockPlayNotificationChime: vi.fn(),
    mockPost: vi.fn(),
  }));

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn((config: typeof mutationConfig) => {
    mutationConfig = config;
    return {
      mutate: vi.fn(),
      mutateAsync: config?.mutationFn,
      isPending: false,
    };
  }),
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock("@/lib/api/client", () => ({
  useApiClient: () => ({ post: mockPost }),
}));

vi.mock("@/lib/query/keys", () => ({
  queryKeys: {
    conversations: {
      lists: () => ["conversations", "list"],
    },
  },
}));

vi.mock("@/hooks/useNotificationChimes", () => ({
  useNotificationChimes: () => ({ play: mockPlayNotificationChime }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { useArchiveConversation } from "../useArchiveConversation";

describe("useArchiveConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationConfig = null;
  });

  it("plays the archive chime when the conversation is archived", () => {
    renderHook(() => useArchiveConversation());

    mutationConfig?.onSuccess?.(
      { _id: "conv-1", archived: true },
      { conversationId: "conv-1" },
    );

    expect(mockPlayNotificationChime).toHaveBeenCalledWith(
      "conversationArchived",
    );
  });
});

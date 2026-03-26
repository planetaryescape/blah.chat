import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDelete,
  mockPost,
  mockBulkDelete,
  mockPut,
  mockUseAction,
  mockUseMutation,
} = vi.hoisted(() => ({
  mockDelete: vi.fn(),
  mockPost: vi.fn(),
  mockBulkDelete: vi.fn(),
  mockPut: vi.fn(),
  mockUseAction: vi.fn(),
  mockUseMutation: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  useApiClient: () => ({
    delete: mockDelete,
    post: mockPost,
  }),
}));

vi.mock("@/lib/cache", () => ({
  cache: {
    conversations: {
      bulkDelete: mockBulkDelete,
      put: mockPut,
    },
  },
}));

import { useBulkConversationCrud } from "../useBulkConversationCrud";

describe("useBulkConversationCrud", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.mockResolvedValue(undefined);
    mockPost.mockImplementation(async (url: string) => {
      if (url.endsWith("/archive")) {
        return { _id: "conv-a", archived: true, updatedAt: 10 };
      }
      if (url.endsWith("/auto-rename")) {
        return { _id: "conv-d", title: "Renamed from REST", updatedAt: 13 };
      }
      if (url.endsWith("/pin")) {
        return { _id: "conv-b", pinned: true, updatedAt: 11 };
      }
      if (url.endsWith("/star")) {
        return { _id: "conv-c", starred: true, updatedAt: 12 };
      }
      return { _id: "unknown", updatedAt: 0 };
    });
  });

  it("fans out bulk delete/archive/auto-rename/pin/star via REST and never uses Convex bulk hooks", async () => {
    const { result } = renderHook(() => useBulkConversationCrud());

    await result.current.deleteMany({
      conversationIds: ["conv-a" as string, "conv-b" as string],
    });
    await result.current.archiveMany({
      conversationIds: ["conv-a" as string],
    });
    await result.current.autoRenameMany({
      conversationIds: ["conv-d" as string],
    });
    await result.current.setPinned(
      [
        {
          _id: "conv-b" as string,
          pinned: false,
        },
      ],
      true,
    );
    await result.current.setStarred(
      [
        {
          _id: "conv-c" as string,
          starred: false,
        },
      ],
      true,
    );

    expect(mockDelete).toHaveBeenCalledWith("/api/v1/conversations/conv-a");
    expect(mockDelete).toHaveBeenCalledWith("/api/v1/conversations/conv-b");
    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/conversations/conv-a/archive",
      undefined,
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/conversations/conv-d/auto-rename",
      undefined,
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/conversations/conv-b/pin",
      undefined,
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/conversations/conv-c/star",
      undefined,
    );
    expect(mockBulkDelete).toHaveBeenCalledWith(["conv-a", "conv-b"]);
    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "conv-d", title: "Renamed from REST" }),
    );
    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "conv-b", pinned: true }),
    );
    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "conv-c", starred: true }),
    );
    expect(mockUseAction).not.toHaveBeenCalled();
    expect(mockUseMutation).not.toHaveBeenCalled();
  });
});

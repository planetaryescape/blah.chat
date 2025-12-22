import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks BEFORE imports
const mockDelete = vi.fn();
const mockArchive = vi.fn();
const mockTogglePin = vi.fn();
const mockToggleStar = vi.fn();
const mockAutoRename = vi.fn();
const mockRouterPush = vi.fn();

vi.mock("@/lib/hooks/mutations", () => ({
  useDeleteConversation: () => ({ mutate: mockDelete, isPending: false }),
  useArchiveConversation: () => ({ mutate: mockArchive, isPending: false }),
  useTogglePin: () => ({ mutate: mockTogglePin, isPending: false }),
  useToggleStar: () => ({ mutate: mockToggleStar, isPending: false }),
}));

vi.mock("convex/react", () => ({
  useAction: () => mockAutoRename,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock("@/lib/analytics", () => ({
  analytics: { track: vi.fn() },
}));

import type { Id } from "@/convex/_generated/dataModel";
// Import AFTER mocks
import { useConversationActions } from "../useConversationActions";

describe("useConversationActions", () => {
  const conversationId = "conv-123" as Id<"conversations">;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns expected interface", () => {
    const { result } = renderHook(() =>
      useConversationActions(conversationId, "header_menu"),
    );

    expect(result.current).toHaveProperty("handleDelete");
    expect(result.current).toHaveProperty("handleArchive");
    expect(result.current).toHaveProperty("handleTogglePin");
    expect(result.current).toHaveProperty("handleToggleStar");
    expect(result.current).toHaveProperty("handleAutoRename");
    expect(result.current).toHaveProperty("isLoading");
  });

  it("handleDelete calls delete mutation with conversationId", () => {
    const { result } = renderHook(() =>
      useConversationActions(conversationId, "header_menu"),
    );

    act(() => {
      result.current.handleDelete();
    });

    expect(mockDelete).toHaveBeenCalledWith(
      { conversationId },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("handleArchive calls archive mutation", () => {
    const { result } = renderHook(() =>
      useConversationActions(conversationId, "header_menu"),
    );

    act(() => {
      result.current.handleArchive();
    });

    expect(mockArchive).toHaveBeenCalledWith(
      { conversationId },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("handleTogglePin calls pin mutation", () => {
    const { result } = renderHook(() =>
      useConversationActions(conversationId, "header_menu"),
    );

    act(() => {
      result.current.handleTogglePin(false);
    });

    expect(mockTogglePin).toHaveBeenCalledWith(
      { conversationId },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("handleToggleStar calls star mutation", () => {
    const { result } = renderHook(() =>
      useConversationActions(conversationId, "header_menu"),
    );

    act(() => {
      result.current.handleToggleStar(false);
    });

    expect(mockToggleStar).toHaveBeenCalledWith(
      { conversationId },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("isLoading is false when no mutations pending", () => {
    const { result } = renderHook(() =>
      useConversationActions(conversationId, "header_menu"),
    );

    expect(result.current.isLoading).toBe(false);
  });

  it("null conversationId skips mutation call", () => {
    const { result } = renderHook(() =>
      useConversationActions(null, "header_menu"),
    );

    act(() => {
      result.current.handleDelete();
      result.current.handleArchive();
      result.current.handleTogglePin(false);
      result.current.handleToggleStar(false);
    });

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockArchive).not.toHaveBeenCalled();
    expect(mockTogglePin).not.toHaveBeenCalled();
    expect(mockToggleStar).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  archiveConversationMock,
  bulkCreateBookmarksMock,
  deleteConversationMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  archiveConversationMock: vi.fn(),
  bulkCreateBookmarksMock: vi.fn(),
  deleteConversationMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/lib/api/sdkClient", () => ({
  useSDKClient: () => ({
    archiveConversation: archiveConversationMock,
    bulkCreateBookmarks: bulkCreateBookmarksMock,
    deleteConversation: deleteConversationMock,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

import { BulkActionToolbar } from "../BulkActionToolbar";

describe("BulkActionToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bulkCreateBookmarksMock.mockResolvedValue({
      bookmarkedCount: 2,
      bookmarkIds: ["bookmark_1", "bookmark_2"],
    });
    archiveConversationMock.mockResolvedValue({});
    deleteConversationMock.mockResolvedValue({
      deleted: true,
      conversationId: "conv_1",
    });
  });

  it("bookmarks selected messages through the SDK", async () => {
    const onClearSelection = vi.fn();
    render(
      <BulkActionToolbar
        selectedCount={2}
        selectedMessages={[
          {
            _id: "msg_1",
            conversationId: "conv_1",
            content: "First",
            role: "assistant",
          },
          {
            _id: "msg_2",
            conversationId: "conv_2",
            content: "Second",
            role: "user",
          },
        ]}
        onClearSelection={onClearSelection}
        onActionComplete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /bookmark/i }));

    await waitFor(() =>
      expect(bulkCreateBookmarksMock).toHaveBeenCalledWith({
        messageIds: ["msg_1", "msg_2"],
      }),
    );
    expect(toastSuccessMock).toHaveBeenCalledWith("Bookmarked 2 message(s)");
    expect(onClearSelection).toHaveBeenCalled();
  });

  it("archives selected conversations through the SDK", async () => {
    const onActionComplete = vi.fn();
    const onClearSelection = vi.fn();

    render(
      <BulkActionToolbar
        selectedCount={2}
        selectedMessages={[
          {
            _id: "msg_1",
            conversationId: "conv_1",
            content: "First",
            role: "assistant",
          },
          {
            _id: "msg_2",
            conversationId: "conv_2",
            content: "Second",
            role: "user",
          },
        ]}
        onClearSelection={onClearSelection}
        onActionComplete={onActionComplete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /archive/i }));

    await waitFor(() => {
      expect(archiveConversationMock).toHaveBeenCalledTimes(2);
    });
    expect(archiveConversationMock).toHaveBeenNthCalledWith(1, "conv_1");
    expect(archiveConversationMock).toHaveBeenNthCalledWith(2, "conv_2");
    expect(onActionComplete).toHaveBeenCalled();
    expect(onClearSelection).toHaveBeenCalled();
  });
});

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/lib/test/render-helpers";

const mockGetBookmarkByMessage = vi.fn();

// Mock analytics
vi.mock("@/lib/analytics", () => ({
  analytics: { track: vi.fn() },
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock SDK client to control bookmark state
vi.mock("@/lib/api/sdkClient", () => ({
  useSDKClient: () => ({
    getBookmarkByMessage: mockGetBookmarkByMessage,
    createBookmark: vi.fn(),
    deleteBookmark: vi.fn(),
    updateBookmark: vi.fn(),
    listBookmarks: vi.fn().mockResolvedValue([]),
  }),
}));

// Import AFTER mocks
import { BookmarkButton } from "../BookmarkButton";

describe("BookmarkButton", () => {
  const defaultProps = {
    messageId: "msg123" as string,
    conversationId: "conv123" as string,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBookmarkByMessage.mockResolvedValue(null);
  });

  it("shows unfilled icon when not bookmarked", () => {
    renderWithProviders(<BookmarkButton {...defaultProps} />);

    const button = screen.getByRole("button", { name: /bookmark message/i });
    expect(button).toBeInTheDocument();
  });

  it("opens dialog when clicking unbookmarked message", async () => {
    const user = userEvent.setup();

    renderWithProviders(<BookmarkButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /bookmark message/i }));

    expect(screen.getByText(/add bookmark/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/note/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
  });

  it("does not render for temp message ids", () => {
    renderWithProviders(
      <BookmarkButton messageId="temp-123" conversationId="conv123" />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

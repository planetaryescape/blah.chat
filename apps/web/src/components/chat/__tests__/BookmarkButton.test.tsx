import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const _mockMutation = vi.fn();
let _mockExistingBookmark: { _id: string } | null = null;

// Mock analytics
vi.mock("@/lib/analytics", () => ({
  analytics: { track: vi.fn() },
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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
    _mockExistingBookmark = null;
  });

  it("shows unfilled icon when not bookmarked", () => {
    render(<BookmarkButton {...defaultProps} />);

    const button = screen.getByRole("button", { name: /bookmark message/i });
    expect(button).toBeInTheDocument();
  });

  it("shows filled icon when bookmarked", () => {
    _mockExistingBookmark = { _id: "bookmark-123" };

    render(<BookmarkButton {...defaultProps} />);

    const button = screen.getByRole("button", { name: /remove bookmark/i });
    expect(button).toBeInTheDocument();
  });

  it("opens dialog when clicking unbookmarked message", async () => {
    const user = userEvent.setup();

    render(<BookmarkButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /bookmark message/i }));

    expect(screen.getByText(/add bookmark/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/note/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
  });

  it("does not render for postgres rewrite ids", () => {
    render(
      <BookmarkButton
        messageId="Xjtnpfv9cM_HkeEKc9OjL"
        conversationId="WRBHYWzRJwMeRigUQqMnq"
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

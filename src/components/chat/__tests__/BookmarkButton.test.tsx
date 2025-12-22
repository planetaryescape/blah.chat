import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock convex/react BEFORE importing component
const mockMutation = vi.fn();
let mockExistingBookmark: { _id: string } | null = null;

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => mockExistingBookmark),
  useMutation: vi.fn(() => mockMutation),
}));

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
import type { Id } from "@/convex/_generated/dataModel";

describe("BookmarkButton", () => {
  const defaultProps = {
    messageId: "msg-123" as Id<"messages">,
    conversationId: "conv-123" as Id<"conversations">,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistingBookmark = null;
  });

  it("shows unfilled icon when not bookmarked", () => {
    render(<BookmarkButton {...defaultProps} />);

    const button = screen.getByRole("button", { name: /bookmark message/i });
    expect(button).toBeInTheDocument();
  });

  it("shows filled icon when bookmarked", () => {
    mockExistingBookmark = { _id: "bookmark-123" };

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
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock convex/react BEFORE importing component
const mockMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => mockMutation),
}));

import type { Doc, Id } from "@/convex/_generated/dataModel";
// Import AFTER mocks
import { RenameDialog } from "../RenameDialog";

const createConversation = (
  overrides: Partial<Doc<"conversations">> = {},
): Doc<"conversations"> =>
  ({
    _id: "conv-123" as Id<"conversations">,
    _creationTime: Date.now(),
    userId: "user-123" as Id<"users">,
    title: "Original Title",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 5,
    pinned: false,
    starred: false,
    archived: false,
    ...overrides,
  }) as Doc<"conversations">;

describe("RenameDialog", () => {
  const defaultProps = {
    conversation: createConversation(),
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows current conversation title in input", () => {
    render(<RenameDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText(/enter title/i);
    expect(input).toHaveValue("Original Title");
  });

  it("calls mutation with new title on save", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<RenameDialog {...defaultProps} onOpenChange={onOpenChange} />);

    const input = screen.getByPlaceholderText(/enter title/i);
    await user.clear(input);
    await user.type(input, "New Title");

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(mockMutation).toHaveBeenCalledWith({
      conversationId: "conv-123",
      title: "New Title",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("submits on Enter key press", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<RenameDialog {...defaultProps} onOpenChange={onOpenChange} />);

    const input = screen.getByPlaceholderText(/enter title/i);
    await user.clear(input);
    await user.type(input, "Enter Title{Enter}");

    expect(mockMutation).toHaveBeenCalledWith({
      conversationId: "conv-123",
      title: "Enter Title",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes dialog without mutation on cancel", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<RenameDialog {...defaultProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockMutation).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

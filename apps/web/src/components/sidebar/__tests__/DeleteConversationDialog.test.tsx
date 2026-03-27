import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeleteConversationDialog } from "../DeleteConversationDialog";

describe("DeleteConversationDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    conversationTitle: "My Conversation",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows warning with conversation title and irreversibility notice", () => {
    render(<DeleteConversationDialog {...defaultProps} />);

    expect(screen.getByText(/delete conversation/i)).toBeInTheDocument();
    expect(screen.getByText(/"My Conversation"/)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it("falls back to 'this conversation' when no title provided", () => {
    render(
      <DeleteConversationDialog
        {...defaultProps}
        conversationTitle={undefined}
      />,
    );

    expect(screen.getByText(/"this conversation"/)).toBeInTheDocument();
  });

  it("calls onConfirm when delete button clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <DeleteConversationDialog {...defaultProps} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange(false) without onConfirm on cancel", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteConversationDialog
        {...defaultProps}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders both Cancel and Delete action buttons", () => {
    render(<DeleteConversationDialog {...defaultProps} />);

    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("does not render dialog content when open is false", () => {
    render(<DeleteConversationDialog {...defaultProps} open={false} />);

    expect(screen.queryByText(/delete conversation/i)).not.toBeInTheDocument();
  });
});

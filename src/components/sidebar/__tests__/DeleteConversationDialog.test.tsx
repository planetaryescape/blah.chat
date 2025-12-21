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

  it("shows warning with conversation title", () => {
    render(<DeleteConversationDialog {...defaultProps} />);

    expect(screen.getByText(/delete conversation/i)).toBeInTheDocument();
    expect(screen.getByText(/"My Conversation"/)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it("calls onConfirm when delete clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <DeleteConversationDialog {...defaultProps} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it("closes without callback on cancel", async () => {
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
});

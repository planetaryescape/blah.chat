import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Convex hooks BEFORE importing component
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => null),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
}));

// Mock the send message hook
const mockSendMessage = vi.fn();
vi.mock("@/lib/hooks/mutations", () => ({
  useSendMessage: () => ({
    mutate: mockSendMessage,
    mutateAsync: mockSendMessage,
    isPending: false,
  }),
}));

// Mock hooks that interact with browser APIs
vi.mock("@/hooks/useMobileDetect", () => ({
  useMobileDetect: () => ({ isMobile: false, isTouchDevice: false }),
}));

vi.mock("@/hooks/useBrowserFeature", () => ({
  default: () => false,
}));

vi.mock("@/hooks/useChatInputEvents", () => ({
  useChatInputEvents: () => {},
}));

vi.mock("@/lib/analytics", () => ({
  analytics: { track: vi.fn() },
}));

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
// Import component AFTER mocks
import { ChatInput } from "../ChatInput";

const defaultProps = {
  conversationId: "test-conversation-id" as Id<"conversations">,
  isGenerating: false,
  selectedModel: "openai:gpt-4o",
  onModelChange: vi.fn(),
  attachments: [],
  onAttachmentsChange: vi.fn(),
};

describe("ChatInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays input value when user types", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const input = screen.getByLabelText("Message input");
    await user.type(input, "Hello world");

    expect(input).toHaveValue("Hello world");
  });

  it("calls sendMessage when user types and presses Enter", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const input = screen.getByLabelText("Message input");
    await user.type(input, "Hello world{Enter}");

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Hello world",
        conversationId: "test-conversation-id",
        modelId: "openai:gpt-4o",
      }),
      expect.any(Object),
    );
  });

  it("inserts newline when Shift+Enter is pressed", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const input = screen.getByLabelText("Message input");
    await user.type(input, "Line 1{Shift>}{Enter}{/Shift}Line 2");

    expect(input).toHaveValue("Line 1\nLine 2");
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("blocks submit when input is empty", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const button = screen.getByRole("button", { name: /send message/i });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("blocks submit when isGenerating is true", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} isGenerating={true} />);

    const input = screen.getByLabelText("Message input");
    await user.type(input, "Hello world{Enter}");

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("shows attachment preview when attachments are provided", () => {
    const attachments = [
      {
        type: "file" as const,
        name: "test.pdf",
        storageId: "storage-123",
        mimeType: "application/pdf",
        size: 1024,
      },
    ];

    render(<ChatInput {...defaultProps} attachments={attachments} />);

    expect(screen.getByText("test.pdf")).toBeInTheDocument();
  });

  it("removes attachment when remove button is clicked", async () => {
    const user = userEvent.setup();
    const onAttachmentsChange = vi.fn();
    const attachments = [
      {
        type: "file" as const,
        name: "test.pdf",
        storageId: "storage-123",
        mimeType: "application/pdf",
        size: 1024,
      },
    ];

    render(
      <ChatInput
        {...defaultProps}
        attachments={attachments}
        onAttachmentsChange={onAttachmentsChange}
      />,
    );

    const removeButton = screen.getByRole("button", { name: /remove/i });
    await user.click(removeButton);

    expect(onAttachmentsChange).toHaveBeenCalledWith([]);
  });
});

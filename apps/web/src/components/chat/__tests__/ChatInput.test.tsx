import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Convex hooks BEFORE importing component
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => null),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
}));

vi.mock("../IntegrationSelector", () => ({
  IntegrationSelector: ({
    onSavingChange,
  }: {
    onSavingChange: (saving: boolean) => void;
  }) => (
    <button type="button" onClick={() => onSavingChange(true)}>
      Start integration save
    </button>
  ),
}));

const voiceTranscript = vi.hoisted(() => ({
  current: (_text: string, _autoSend?: boolean): Promise<void> =>
    Promise.resolve(),
}));
vi.mock("../VoiceInput", () => ({
  VoiceInput: ({
    onTranscript,
  }: {
    onTranscript: (text: string, autoSend?: boolean) => Promise<void>;
  }) => {
    voiceTranscript.current = onTranscript;
    return null;
  },
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
let mobileDetectState = { isMobile: false, isTouchDevice: false };
vi.mock("@/hooks/useMobileDetect", () => ({
  useMobileDetect: () => mobileDetectState,
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
    mobileDetectState = { isMobile: false, isTouchDevice: false };
  });

  it("keeps Stop available while an integration save is pending", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} isGenerating={true} />);
    await user.click(
      screen.getByRole("button", { name: "Start integration save" }),
    );
    expect(
      screen.getByRole("button", { name: "Stop generating response" }),
    ).toBeEnabled();
  });

  it("retains a voice auto-send as a draft while integration choices are saving", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);
    await user.click(
      screen.getByRole("button", { name: "Start integration save" }),
    );
    await act(async () =>
      voiceTranscript.current("Retain this voice draft", true),
    );
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Message input")).toHaveValue(
      "Retain this voice draft",
    );
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
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

  it("does not restore a fresh-key draft after an uncertain send was queued", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const input = screen.getByLabelText("Message input");
    await user.type(input, "Already saved for safe replay{Enter}");
    const [, callbacks] = mockSendMessage.mock.calls[0] as [
      unknown,
      { onError: (error: Error & { queued: true }) => void },
    ];
    const uncertainError = Object.assign(new Error("Send outcome unknown"), {
      queued: true as const,
    });
    await act(async () => callbacks.onError(uncertainError));

    expect(input).toHaveValue("");
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

  it("keeps focus and input value stable on mobile touch typing", async () => {
    mobileDetectState = { isMobile: true, isTouchDevice: true };
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const input = screen.getByLabelText("Message input");
    await user.click(input);
    expect(input).toHaveFocus();

    await user.type(input, "Mobile typing");
    expect(input).toHaveValue("Mobile typing");
    expect(input).toHaveFocus();
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

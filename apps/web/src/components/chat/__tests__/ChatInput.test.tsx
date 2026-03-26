import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/hooks/useUserPreference", () => ({
  useUserPreference: vi.fn((key: string) => {
    if (key === "sendOnEnter") return true;
    if (key === "sttEnabled") return true;
    if (key === "sttProvider") return "openai";
    return undefined;
  }),
}));

vi.mock("@/hooks/useFeatureToggles", () => ({
  useFeatureToggles: () => ({
    isLoading: false,
    showNotes: true,
    showTemplates: true,
    showProjects: true,
    showBookmarks: true,
  }),
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(() => null),
}));

vi.mock("@/lib/analytics", () => ({
  analytics: { track: vi.fn() },
}));

vi.mock("@/lib/api/client", () => ({
  useApiClient: () => ({
    post: vi.fn(),
    get: vi.fn(),
  }),
}));

vi.mock("@/lib/api/sdkClient", () => ({
  useSDKClient: () => ({
    transcribeAudio: vi.fn(),
    waitForJob: vi.fn(),
    extractMemories: vi.fn(),
    generateImage: vi.fn(),
  }),
}));

// Import component AFTER mocks
import { ChatInput } from "../ChatInput";

const defaultProps = {
  conversationId: "test-conversation-id" as string,
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

  it("displays input value when user types", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const input = screen.getByLabelText("Message input");
    await user.type(input, "Hello world");

    expect(input).toHaveValue("Hello world");
  });

  it("calls sendMessage when user types and presses Enter", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} parentMessageId="msg-parent-1" />);

    const input = screen.getByLabelText("Message input");
    await user.type(input, "Hello world{Enter}");

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Hello world",
        conversationId: "test-conversation-id",
        parentMessageId: "msg-parent-1",
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

  it("does not exit comparison mode when props update after starting comparison", async () => {
    const onExitComparison = vi.fn();

    const { rerender } = render(
      <ChatInput
        {...defaultProps}
        isComparisonMode={false}
        selectedModels={[]}
        onStartComparison={vi.fn()}
        onExitComparison={onExitComparison}
      />,
    );

    rerender(
      <ChatInput
        {...defaultProps}
        isComparisonMode={true}
        selectedModels={["openai:gpt-4o", "openai:gpt-4o-mini"]}
        onStartComparison={vi.fn()}
        onExitComparison={onExitComparison}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onExitComparison).not.toHaveBeenCalled();
  });
});

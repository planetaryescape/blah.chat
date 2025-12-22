import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Convex hooks BEFORE importing component
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => null),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
}));

// Mock hooks
vi.mock("@/hooks/useFeatureToggles", () => ({
  useFeatureToggles: () => ({}),
}));

vi.mock("@/hooks/useUserPreference", () => ({
  useUserPreference: () => false,
}));

vi.mock("@/hooks/useMessageKeyboardShortcuts", () => ({
  useMessageKeyboardShortcuts: () => {},
}));

// Mock markdown to render plain text (react-markdown has jsdom issues)
vi.mock("../MarkdownContent", () => ({
  MarkdownContent: ({ content }: { content: string }) => (
    <div data-testid="markdown">{content}</div>
  ),
}));

// Mock auto-scroll hook with controllable state
const mockScrollToBottom = vi.fn();
let mockShowScrollButton = false;

vi.mock("@/hooks/useAutoScroll", () => ({
  useAutoScroll: () => ({
    containerRef: { current: null },
    scrollToBottom: mockScrollToBottom,
    showScrollButton: mockShowScrollButton,
    isAtBottom: true,
  }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({
      children,
      ...props
    }: { children: React.ReactNode } & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

import type { Id } from "@/convex/_generated/dataModel";
// Import component AFTER mocks
import { MessageList } from "../MessageList";

type MessageStatus =
  | "pending"
  | "generating"
  | "complete"
  | "stopped"
  | "error";

const createMessage = (
  overrides: Partial<{
    _id: string;
    role: "user" | "assistant";
    content: string;
    status: MessageStatus;
    model: string;
    comparisonGroupId: string;
  }> = {},
) => ({
  _id: (overrides._id || `msg-${Math.random()}`) as Id<"messages">,
  _creationTime: Date.now(),
  conversationId: "conv-123" as Id<"conversations">,
  userId: "user-123" as Id<"users">,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  role: overrides.role || ("user" as const),
  content: overrides.content || "Test message",
  status: overrides.status || ("complete" as const),
  model: overrides.model,
  comparisonGroupId: overrides.comparisonGroupId,
});

const defaultProps = {
  messages: [],
  showModelNames: true,
  onVote: vi.fn(),
  onConsolidate: vi.fn(),
  onToggleModelNames: vi.fn(),
};

describe("MessageList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShowScrollButton = false;
  });

  it("renders list of messages with accessible log role", () => {
    const messages = [
      createMessage({ _id: "msg-1", role: "user", content: "Hello" }),
      createMessage({
        _id: "msg-2",
        role: "assistant",
        content: "Hi there!",
        model: "openai:gpt-4o",
      }),
    ];

    render(<MessageList {...defaultProps} messages={messages} />);

    // Log region is accessible
    const log = screen.getByRole("log");
    expect(log).toHaveAttribute("aria-label", "Chat message history");

    // Both messages render
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText(/Hi there/)).toBeInTheDocument();
  });

  it("shows empty screen when no messages", () => {
    render(<MessageList {...defaultProps} messages={[]} />);

    // Should not have log role when empty
    expect(screen.queryByRole("log")).not.toBeInTheDocument();

    // EmptyScreen renders - check for category buttons (Thinking, Vision, Code, etc.)
    expect(
      screen.getByRole("button", { name: /thinking/i }),
    ).toBeInTheDocument();
  });

  it("groups comparison messages together", () => {
    const comparisonGroupId = "compare-123";
    const messages = [
      createMessage({
        _id: "msg-user",
        role: "user",
        content: "Compare these",
        comparisonGroupId,
      }),
      createMessage({
        _id: "msg-a",
        role: "assistant",
        content: "Response A",
        model: "openai:gpt-4o",
        comparisonGroupId,
      }),
      createMessage({
        _id: "msg-b",
        role: "assistant",
        content: "Response B",
        model: "anthropic:claude-3-5-sonnet",
        comparisonGroupId,
      }),
    ];

    render(<MessageList {...defaultProps} messages={messages} />);

    // User message renders
    expect(screen.getByText("Compare these")).toBeInTheDocument();

    // Both assistant responses render (in comparison view)
    expect(screen.getByText(/Response A/)).toBeInTheDocument();
    expect(screen.getByText(/Response B/)).toBeInTheDocument();
  });

  it("shows scroll button when not at bottom", () => {
    mockShowScrollButton = true;

    const messages = [
      createMessage({ _id: "msg-1", role: "user", content: "Message" }),
    ];

    render(<MessageList {...defaultProps} messages={messages} />);

    const scrollButton = screen.getByRole("button", {
      name: /scroll to bottom/i,
    });
    expect(scrollButton).toBeInTheDocument();
  });
});

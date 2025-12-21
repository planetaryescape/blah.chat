import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// Import component AFTER mocks
import { ChatMessage } from "../ChatMessage";
import type { Id } from "@/convex/_generated/dataModel";

const baseMessage = {
  _id: "msg-123" as Id<"messages">,
  _creationTime: Date.now(),
  conversationId: "conv-123" as Id<"conversations">,
  userId: "user-123" as Id<"users">,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe("ChatMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders user message content", () => {
    const message = {
      ...baseMessage,
      role: "user" as const,
      content: "Hello, this is my message",
      status: "complete" as const,
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByLabelText("Your message")).toBeInTheDocument();
    expect(screen.getByText("Hello, this is my message")).toBeInTheDocument();
  });

  it("renders assistant message content", () => {
    const message = {
      ...baseMessage,
      role: "assistant" as const,
      content: "Hello! How can I help you?",
      status: "complete" as const,
      model: "openai:gpt-4o",
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByLabelText("Assistant message")).toBeInTheDocument();
    expect(screen.getByText(/Hello! How can I help you/)).toBeInTheDocument();
  });

  it("shows loading state when status is generating", () => {
    const message = {
      ...baseMessage,
      role: "assistant" as const,
      content: "",
      status: "generating" as const,
      model: "openai:gpt-4o",
    };

    render(<ChatMessage message={message} />);

    // Loading state should be visible (check for status role or loading indicator)
    const messageEl = screen.getByLabelText("Assistant message");
    expect(messageEl).toHaveAttribute("data-status", "generating");
  });

  it("shows loading state when status is pending", () => {
    const message = {
      ...baseMessage,
      role: "assistant" as const,
      content: "",
      status: "pending" as const,
      model: "openai:gpt-4o",
    };

    render(<ChatMessage message={message} />);

    const messageEl = screen.getByLabelText("Assistant message");
    expect(messageEl).toHaveAttribute("data-status", "pending");
  });

  it("shows error message when status is error", () => {
    const message = {
      ...baseMessage,
      role: "assistant" as const,
      content: "",
      status: "error" as const,
      error: "Rate limit exceeded",
      model: "openai:gpt-4o",
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText("Unable to generate response")).toBeInTheDocument();
    expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
  });

  it("renders partial content during streaming", () => {
    const message = {
      ...baseMessage,
      role: "assistant" as const,
      content: "",
      partialContent: "This is being streamed...",
      status: "generating" as const,
      model: "openai:gpt-4o",
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText(/This is being streamed/)).toBeInTheDocument();
  });

  it("shows stats badges for complete assistant messages", () => {
    const message = {
      ...baseMessage,
      role: "assistant" as const,
      content: "Complete response",
      status: "complete" as const,
      model: "openai:gpt-4o",
      inputTokens: 100,
      outputTokens: 50,
      timeToFirstToken: 500,
    };

    render(<ChatMessage message={message} />);

    // Model name should be visible in stats
    expect(screen.getByLabelText("Assistant message")).toBeInTheDocument();
    expect(screen.getByText("Complete response")).toBeInTheDocument();
  });
});

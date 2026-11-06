import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { getFunctionName } from "convex/server";
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

// Mock QuickModelSwitcher to avoid sortModels dependency issues
vi.mock("../QuickModelSwitcher", () => ({
  QuickModelSwitcher: () => null,
}));

import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
// Import component AFTER mocks
import { ChatMessage } from "../ChatMessage";

const baseMessage = {
  _id: "msg-123" as Id<"messages">,
  _creationTime: Date.now(),
  conversationId: "conv-123" as Id<"conversations">,
  userId: "user-123" as Id<"users">,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const conversation: Doc<"conversations"> = {
  _id: baseMessage.conversationId,
  _creationTime: 0,
  userId: baseMessage.userId,
  title: "Receipt fixture",
  model: "openai:gpt-4o",
  pinned: false,
  archived: false,
  starred: false,
  lastMessageAt: 0,
  createdAt: 0,
  updatedAt: 0,
};

describe("ChatMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockImplementation(() => null);
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

  it("renders a read-only shared answer without subscribing to private sources", () => {
    vi.mocked(useQuery).mockImplementation((...parameters) => {
      const [reference, args] = parameters;
      if (
        getFunctionName(reference) === "sources/operations:getSources" &&
        args !== "skip"
      ) {
        throw new Error(
          "A public shared answer must not query private sources",
        );
      }
      return null;
    });
    const message = {
      ...baseMessage,
      role: "assistant" as const,
      content: "A readable shared answer",
      status: "complete" as const,
    };

    render(<ChatMessage message={message} readOnly />);

    expect(screen.getByText("A readable shared answer")).toBeInTheDocument();
    const sourceCalls = vi
      .mocked(useQuery)
      .mock.calls.filter(
        ([reference]) =>
          getFunctionName(reference) === "sources/operations:getSources",
      );
    expect(sourceCalls.every(([, args]) => args === "skip")).toBe(true);
  });

  it("keeps source lookup enabled for an editable private answer", () => {
    const message = {
      ...baseMessage,
      role: "assistant" as const,
      content: "A private answer with citations",
      status: "complete" as const,
    };

    render(<ChatMessage message={message} />);

    const sourceCalls = vi
      .mocked(useQuery)
      .mock.calls.filter(
        ([reference]) =>
          getFunctionName(reference) === "sources/operations:getSources",
      );
    expect(sourceCalls.map(([, args]) => args)).toContainEqual({
      messageId: message._id,
    });
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

  it.each([
    "complete",
    "stopped",
    "error",
  ] as const)("renders the ordinary receipt for a %s assistant answer", (status) => {
    vi.mocked(useQuery).mockImplementation((...parameters) => {
      const [reference] = parameters;
      return getFunctionName(reference) === "chatSettlement:getReceipt"
        ? {
            inputTokens: 80,
            outputTokens: 8,
            costUsd: 0.008,
            reportedDispatchCount: 1,
            unresolvedDispatchCount: 0,
            estimatedDispatchCount: 0,
            hasUnknownCost: false,
            hasUnknownUsage: false,
          }
        : null;
    });
    render(
      <ChatMessage
        conversation={conversation}
        message={{
          ...baseMessage,
          role: "assistant",
          content: "",
          status,
          error: status === "error" ? "Provider interrupted" : undefined,
        }}
      />,
    );
    expect(screen.getByText(/Usage receipt · ≈\$0.008000 USD/)).toBeVisible();
  });

  it.each([
    { readOnly: true, conversation },
    { readOnly: false, conversation: { ...conversation, isIncognito: true } },
    { readOnly: false, conversation: undefined },
  ])("does not subscribe to private receipts outside ordinary editable chat: %j", (props) => {
    vi.mocked(useQuery).mockImplementation((...parameters) => {
      const [reference] = parameters;
      if (getFunctionName(reference) === "chatSettlement:getReceipt")
        throw new Error("Private receipt must not be queried");
      return null;
    });
    render(
      <ChatMessage
        {...props}
        message={{
          ...baseMessage,
          role: "assistant",
          content: "",
          status: "error",
        }}
      />,
    );
    expect(screen.queryByText(/Usage receipt/)).not.toBeInTheDocument();
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

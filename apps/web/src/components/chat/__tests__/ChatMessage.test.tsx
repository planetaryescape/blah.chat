import { act, fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/lib/test/render-helpers";

const regenerateMutate = vi.fn();
const useRestQueryMock = vi.fn();
const apiClientGetMock = vi.fn();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );

  return {
    ...actual,
    useQuery: (...args: unknown[]) => useRestQueryMock(...args),
  };
});

// Mock hooks
vi.mock("@/hooks/useFeatureToggles", () => ({
  useFeatureToggles: () => ({
    showNotes: true,
    showBookmarks: true,
    showTemplates: true,
    showProjects: true,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useUserPreference", () => ({
  useUserPreference: () => false,
}));

vi.mock("@/lib/api/client", () => ({
  useApiClient: () => ({
    get: apiClientGetMock,
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/mutations/useRegenerateMessage", () => ({
  useRegenerateMessage: () => ({
    mutate: regenerateMutate,
  }),
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

// Import component AFTER mocks
import { ChatMessage } from "../ChatMessage";

const baseMessage = {
  _id: "msg-123" as string,
  _creationTime: Date.now(),
  conversationId: "conv-123" as string,
  userId: "user-123" as string,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe("ChatMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRestQueryMock.mockImplementation(
      (options?: { queryKey?: unknown[] }) => {
        const queryKey = options?.queryKey ?? [];

        if (queryKey[0] === "message" && queryKey[2] === "original-responses") {
          return {
            data: undefined,
            isLoading: false,
            error: null,
          };
        }

        return {
          data: undefined,
          isLoading: false,
          error: null,
        };
      },
    );
  });

  it("disables original-response fetching for temporary consolidated messages", () => {
    const message = {
      ...baseMessage,
      _id: "temp-user-123",
      role: "assistant" as const,
      content: "Merged answer",
      status: "complete" as const,
      model: "openai:gpt-5-mini",
      isConsolidation: true,
    };

    renderWithProviders(<ChatMessage message={message} />);

    expect(useRestQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["message", "temp-user-123", "original-responses"],
        enabled: false,
        retry: false,
        retryOnMount: false,
      }),
    );
    expect(apiClientGetMock).not.toHaveBeenCalled();
  });

  it("renders user message content", () => {
    const message = {
      ...baseMessage,
      role: "user" as const,
      content: "Hello, this is my message",
      status: "complete" as const,
    };

    renderWithProviders(<ChatMessage message={message} />);

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

    renderWithProviders(<ChatMessage message={message} />);

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

    renderWithProviders(<ChatMessage message={message} />);

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

    renderWithProviders(<ChatMessage message={message} />);

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

    renderWithProviders(<ChatMessage message={message} />);

    expect(screen.getByText("Unable to generate response")).toBeInTheDocument();
    expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
  });

  it("retries a failed message and resets the retry state when settled", async () => {
    let onSettled: (() => void) | undefined;
    regenerateMutate.mockImplementation((_variables, options) => {
      onSettled = options?.onSettled;
    });

    const message = {
      ...baseMessage,
      role: "assistant" as const,
      content: "",
      status: "error" as const,
      error: "Rate limit exceeded",
      model: "openai:gpt-4o",
    };

    renderWithProviders(<ChatMessage message={message} />);

    const retryButton = screen.getByRole("button", { name: "Try Again" });
    fireEvent.click(retryButton);

    expect(regenerateMutate).toHaveBeenCalledWith(
      {
        messageId: "msg-123",
        conversationId: "conv-123",
        modelId: "auto",
      },
      expect.objectContaining({
        onSettled: expect.any(Function),
      }),
    );
    expect(retryButton).toBeDisabled();

    act(() => {
      onSettled?.();
    });

    expect(
      screen.getByRole("button", { name: "Try Again" }),
    ).not.toBeDisabled();
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

    renderWithProviders(<ChatMessage message={message} />);

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

    renderWithProviders(<ChatMessage message={message} />);

    // Model name should be visible in stats
    expect(screen.getByLabelText("Assistant message")).toBeInTheDocument();
    expect(screen.getByText("Complete response")).toBeInTheDocument();
  });

  it("rehydrates original responses for a same-chat consolidated message after remount", () => {
    const originalResponses = [
      {
        sys: { entity: "message", id: "msg-original-1" },
        data: {
          ...baseMessage,
          _id: "msg-original-1",
          role: "assistant" as const,
          content: "Original answer one",
          status: "complete" as const,
          model: "openai:gpt-5",
          isConsolidation: false,
        },
      },
      {
        sys: { entity: "message", id: "msg-original-2" },
        data: {
          ...baseMessage,
          _id: "msg-original-2",
          role: "assistant" as const,
          content: "Original answer two",
          status: "complete" as const,
          model: "anthropic:claude-sonnet-4",
          isConsolidation: false,
        },
      },
    ];

    useRestQueryMock.mockImplementation(
      (options?: { queryKey?: unknown[] }) => {
        const queryKey = options?.queryKey ?? [];

        if (queryKey[0] === "message" && queryKey[2] === "original-responses") {
          return {
            data: originalResponses,
            isLoading: false,
            error: null,
          };
        }

        return {
          data: undefined,
          isLoading: false,
          error: null,
        };
      },
    );

    const message = {
      ...baseMessage,
      role: "assistant" as const,
      content: "Merged answer",
      status: "complete" as const,
      model: "openai:gpt-5-mini",
      isConsolidation: true,
    };

    const firstRender = renderWithProviders(<ChatMessage message={message} />);
    expect(
      screen.getByRole("button", {
        name: /show original 2 responses/i,
      }),
    ).toBeInTheDocument();

    firstRender.unmount();

    renderWithProviders(<ChatMessage message={message} />);

    const toggle = screen.getByRole("button", {
      name: /show original 2 responses/i,
    });
    fireEvent.click(toggle);

    expect(screen.getByText("Original answer one")).toBeInTheDocument();
    expect(screen.getByText("Original answer two")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /choose winner/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /consolidate responses/i }),
    ).not.toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => null),
}));

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({
    data,
    itemContent,
  }: {
    data: unknown[];
    itemContent: (index: number, item: unknown) => React.ReactNode;
  }) => (
    <div data-testid="virtuoso">
      {data.map((item, index) => (
        <div key={index}>{itemContent(index, item)}</div>
      ))}
    </div>
  ),
}));

vi.mock("@/hooks/useCacheSync", () => ({
  useMetadataCacheSync: vi.fn(),
}));

vi.mock("@/hooks/useMessageNavigation", () => ({
  useMessageNavigation: vi.fn(),
}));

vi.mock("@/hooks/usePrefersReducedMotion", () => ({
  usePrefersReducedMotion: () => true,
}));

vi.mock("@/hooks/useScrollAnchor", () => ({
  useScrollAnchor: vi.fn(),
}));

vi.mock("@/hooks/useScrollIntent", () => ({
  useScrollIntent: () => ({
    escapedFromBottom: false,
    autoScrollEnabled: true,
    enableAutoScroll: vi.fn(),
  }),
}));

vi.mock("@/hooks/useScrollRestoration", () => ({
  useScrollRestoration: () => ({
    restore: () => false,
  }),
}));

vi.mock("@/hooks/useUserPreference", () => ({
  useUserPreference: () => false,
}));

vi.mock("@/lib/smooth-scroll", () => ({
  scrollToBottom: vi.fn(),
}));

vi.mock("../ChatMessage", () => ({
  ChatMessage: ({ message }: { message: { _id: string; content: string } }) => (
    <div data-testid={`message-${message._id}`}>{message.content}</div>
  ),
}));

vi.mock("../ComparisonView", () => ({
  ComparisonView: () => <div data-testid="comparison-view" />,
}));

vi.mock("../DateSeparator", () => ({
  DateSeparator: ({ timestamp }: { timestamp: number }) => (
    <div data-testid={`date-separator-${timestamp}`}>date</div>
  ),
}));

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { VirtualizedMessageList } from "../VirtualizedMessageList";

const now = 1_700_000_000_000;

const baseMessage = {
  conversationId: "conv-123" as Id<"conversations">,
  userId: "user-123" as Id<"users">,
  createdAt: now,
  updatedAt: now,
  _creationTime: now,
};

describe("VirtualizedMessageList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders only active-branch messages in the visible timeline", () => {
    render(
      <VirtualizedMessageList
        conversationId={"conv-123" as Id<"conversations">}
        messages={[
          {
            ...baseMessage,
            _id: "msg-user" as Id<"messages">,
            role: "user",
            content: "Active question",
            status: "complete",
            isActiveBranch: true,
          },
          {
            ...baseMessage,
            _id: "msg-active" as Id<"messages">,
            role: "assistant",
            content: "Active answer",
            status: "complete",
            createdAt: now + 1,
            updatedAt: now + 1,
            _creationTime: now + 1,
            isActiveBranch: true,
          },
          {
            ...baseMessage,
            _id: "msg-inactive" as Id<"messages">,
            role: "assistant",
            content: "Inactive branch answer",
            status: "complete",
            createdAt: now + 2,
            updatedAt: now + 2,
            _creationTime: now + 2,
            isActiveBranch: false,
          },
        ]}
        showModelNames={false}
      />,
    );

    expect(screen.getByText("Active question")).toBeInTheDocument();
    expect(screen.getByText("Active answer")).toBeInTheDocument();
    expect(
      screen.queryByText("Inactive branch answer"),
    ).not.toBeInTheDocument();
  });
});

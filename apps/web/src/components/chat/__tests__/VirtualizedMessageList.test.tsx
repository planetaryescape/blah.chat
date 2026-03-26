import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const comparisonViewMock = vi.fn();

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
  ComparisonView: (props: { assistantMessages: Array<{ _id: string }> }) => {
    comparisonViewMock(props);
    return (
      <div data-testid="comparison-view">
        comparison-count-{props.assistantMessages.length}
      </div>
    );
  },
}));

vi.mock("../DateSeparator", () => ({
  DateSeparator: ({ timestamp }: { timestamp: number }) => (
    <div data-testid={`date-separator-${timestamp}`}>date</div>
  ),
}));

import { VirtualizedMessageList } from "../VirtualizedMessageList";

const now = 1_700_000_000_000;

const baseMessage = {
  conversationId: "conv-123" as string,
  userId: "user-123" as string,
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
        conversationId={"conv-123" as string}
        messages={[
          {
            ...baseMessage,
            _id: "msg-user" as string,
            role: "user",
            content: "Active question",
            status: "complete",
            isActiveBranch: true,
          },
          {
            ...baseMessage,
            _id: "msg-active" as string,
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
            _id: "msg-inactive" as string,
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

  it("keeps inactive comparison siblings visible inside the comparison group", () => {
    render(
      <VirtualizedMessageList
        conversationId={"conv-123" as string}
        messages={[
          {
            ...baseMessage,
            _id: "msg-user" as string,
            role: "user",
            content: "Compare these",
            status: "complete",
            comparisonGroupId: "cmp_1",
            isActiveBranch: true,
          },
          {
            ...baseMessage,
            _id: "msg-active" as string,
            role: "assistant",
            content: "Active model",
            status: "complete",
            comparisonGroupId: "cmp_1",
            createdAt: now + 1,
            updatedAt: now + 1,
            _creationTime: now + 1,
            isActiveBranch: true,
          },
          {
            ...baseMessage,
            _id: "msg-inactive" as string,
            role: "assistant",
            content: "Inactive model",
            status: "stopped",
            comparisonGroupId: "cmp_1",
            createdAt: now + 2,
            updatedAt: now + 2,
            _creationTime: now + 2,
            isActiveBranch: false,
          },
        ]}
        showModelNames={false}
      />,
    );

    expect(screen.getByTestId("comparison-view")).toHaveTextContent(
      "comparison-count-2",
    );
    expect(comparisonViewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assistantMessages: expect.arrayContaining([
          expect.objectContaining({ _id: "msg-active" }),
          expect.objectContaining({ _id: "msg-inactive" }),
        ]),
      }),
    );
  });
});

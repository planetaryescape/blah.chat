import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useComparisonGroupStateMock = vi.fn();
const analyticsTrackMock = vi.fn();

vi.mock("@/hooks/useComparisonGroupState", () => ({
  useComparisonGroupState: (...args: unknown[]) =>
    useComparisonGroupStateMock(...args),
}));

vi.mock("@/hooks/useSyncedScroll", () => ({
  useSyncedScroll: () => ({
    register: vi.fn(),
  }),
}));

vi.mock("@/hooks/useUserPreference", () => ({
  useUserPreference: () => false,
}));

vi.mock("@/lib/analytics", () => ({
  analytics: {
    track: (...args: unknown[]) => analyticsTrackMock(...args),
  },
}));

vi.mock("../MarkdownContent", () => ({
  MarkdownContent: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock("../ConsolidateDialog", () => ({
  ConsolidateDialog: () => null,
}));

import { ComparisonView } from "../ComparisonView";

const assistantMessages = [
  {
    _id: "msg_1",
    role: "assistant" as const,
    content: "First answer",
    status: "complete",
    model: "openai:gpt-5",
    comparisonGroupId: "cmp_1",
    createdAt: 1,
  },
  {
    _id: "msg_2",
    role: "assistant" as const,
    content: "Second answer",
    status: "complete",
    model: "anthropic:claude-sonnet-4",
    comparisonGroupId: "cmp_1",
    createdAt: 2,
  },
];

describe("ComparisonView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useComparisonGroupStateMock.mockReturnValue({
      comparisonGroup: {
        comparisonGroupId: "cmp_1",
        status: "complete",
        requestId: null,
        sessionsByMessageId: {
          msg_1: {
            sessionId: "sess_1",
            modelId: "openai:gpt-5",
            status: "complete",
          },
          msg_2: {
            sessionId: "sess_2",
            modelId: "anthropic:claude-sonnet-4",
            status: "complete",
          },
        },
        latestVote: null,
      },
      stopGroup: vi.fn(),
      stopSession: vi.fn(),
      refetch: vi.fn(),
      isStoppingGroup: false,
      stoppingSessionIds: [],
      isLoading: false,
    });
  });

  it("renders persisted winner state from server-backed comparison data", () => {
    useComparisonGroupStateMock.mockReturnValueOnce({
      comparisonGroup: {
        comparisonGroupId: "cmp_1",
        status: "complete",
        requestId: null,
        sessionsByMessageId: {
          msg_1: {
            sessionId: "sess_1",
            modelId: "openai:gpt-5",
            status: "complete",
          },
          msg_2: {
            sessionId: "sess_2",
            modelId: "anthropic:claude-sonnet-4",
            status: "complete",
          },
        },
        latestVote: {
          outcome: "winner",
          winnerMessageId: "msg_2",
          votedAt: 123,
        },
      },
      stopGroup: vi.fn(),
      stopSession: vi.fn(),
      refetch: vi.fn(),
      isStoppingGroup: false,
      stoppingSessionIds: [],
      isLoading: false,
    });

    render(
      <ComparisonView
        assistantMessages={assistantMessages}
        comparisonGroupId="cmp_1"
        showModelNames={true}
        onVote={vi.fn()}
        onConsolidate={vi.fn()}
        onToggleModelNames={vi.fn()}
      />,
    );

    expect(screen.getByText("Voted")).toBeInTheDocument();
  });

  it("submits winner and tie outcomes through the public callbacks", async () => {
    const user = userEvent.setup();
    const onVote = vi.fn().mockResolvedValue(undefined);
    const refetch = vi.fn();

    useComparisonGroupStateMock.mockReturnValueOnce({
      comparisonGroup: {
        comparisonGroupId: "cmp_1",
        status: "complete",
        requestId: null,
        sessionsByMessageId: {
          msg_1: {
            sessionId: "sess_1",
            modelId: "openai:gpt-5",
            status: "complete",
          },
          msg_2: {
            sessionId: "sess_2",
            modelId: "anthropic:claude-sonnet-4",
            status: "complete",
          },
        },
        latestVote: null,
      },
      stopGroup: vi.fn(),
      stopSession: vi.fn(),
      refetch,
      isStoppingGroup: false,
      stoppingSessionIds: [],
      isLoading: false,
    });

    render(
      <ComparisonView
        assistantMessages={assistantMessages}
        comparisonGroupId="cmp_1"
        showModelNames={true}
        onVote={onVote}
        onConsolidate={vi.fn()}
        onToggleModelNames={vi.fn()}
      />,
    );

    await user.click(
      screen.getAllByRole("button", { name: /choose winner/i })[0],
    );

    await waitFor(() => expect(onVote).toHaveBeenCalledWith("msg_1", "winner"));

    await user.click(screen.getByRole("button", { name: /mark tie/i }));

    await waitFor(() => expect(onVote).toHaveBeenCalledWith(undefined, "tie"));
    expect(refetch).toHaveBeenCalled();
  });

  it("calls stop handlers for the whole comparison and an individual model", async () => {
    const user = userEvent.setup();
    const stopGroup = vi.fn().mockResolvedValue(undefined);
    const stopSession = vi.fn().mockResolvedValue(undefined);

    useComparisonGroupStateMock.mockReturnValueOnce({
      comparisonGroup: {
        comparisonGroupId: "cmp_1",
        status: "running",
        requestId: "req_1",
        sessionsByMessageId: {
          msg_1: {
            sessionId: "sess_1",
            modelId: "openai:gpt-5",
            status: "running",
          },
          msg_2: {
            sessionId: "sess_2",
            modelId: "anthropic:claude-sonnet-4",
            status: "complete",
          },
        },
        latestVote: null,
      },
      stopGroup,
      stopSession,
      refetch: vi.fn(),
      isStoppingGroup: false,
      stoppingSessionIds: [],
      isLoading: false,
    });

    render(
      <ComparisonView
        assistantMessages={assistantMessages}
        comparisonGroupId="cmp_1"
        showModelNames={true}
        onVote={vi.fn()}
        onConsolidate={vi.fn()}
        onToggleModelNames={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /stop comparison/i }));
    await waitFor(() => expect(stopGroup).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: /stop gpt-5/i }));
    await waitFor(() => expect(stopSession).toHaveBeenCalledWith("msg_1"));
  });

  it("prefers server-backed assistant state when local comparison messages are stale", async () => {
    useComparisonGroupStateMock.mockReturnValueOnce({
      comparisonGroup: {
        comparisonGroupId: "cmp_1",
        status: "complete",
        requestId: null,
        sessionsByMessageId: {
          msg_1: {
            sessionId: "sess_1",
            modelId: "openai:gpt-5",
            status: "complete",
          },
          msg_2: {
            sessionId: "sess_2",
            modelId: "anthropic:claude-sonnet-4",
            status: "complete",
          },
        },
        assistantMessagesById: {
          msg_1: {
            content: "Fresh first answer",
            status: "complete",
            model: "openai:gpt-5",
          },
          msg_2: {
            content: "Fresh second answer",
            status: "complete",
            model: "anthropic:claude-sonnet-4",
          },
        },
        latestVote: null,
      },
      stopGroup: vi.fn(),
      stopSession: vi.fn(),
      refetch: vi.fn(),
      isStoppingGroup: false,
      stoppingSessionIds: [],
      isLoading: false,
    });

    render(
      <ComparisonView
        assistantMessages={[
          {
            ...assistantMessages[0],
            content: "",
            status: "generating",
          },
          {
            ...assistantMessages[1],
            content: "",
            status: "generating",
          },
        ]}
        comparisonGroupId="cmp_1"
        showModelNames={true}
        onVote={vi.fn()}
        onConsolidate={vi.fn()}
        onToggleModelNames={vi.fn()}
      />,
    );

    expect(screen.getByText("Fresh first answer")).toBeInTheDocument();
    expect(screen.getByText("Fresh second answer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark tie/i })).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: /choose winner/i }),
    ).toHaveLength(2);
  });

  it("treats terminal session state as authoritative when assistant snapshots are stale", () => {
    useComparisonGroupStateMock.mockReturnValueOnce({
      comparisonGroup: {
        comparisonGroupId: "cmp_1",
        status: "complete",
        requestId: null,
        sessionsByMessageId: {
          msg_1: {
            sessionId: "sess_1",
            modelId: "openai:gpt-5",
            status: "cancelled",
          },
          msg_2: {
            sessionId: "sess_2",
            modelId: "anthropic:claude-sonnet-4",
            status: "complete",
          },
        },
        assistantMessagesById: {
          msg_1: {
            content: "Stopped answer",
            status: "pending",
            model: "openai:gpt-5",
          },
          msg_2: {
            content: "Finished answer",
            status: "pending",
            model: "anthropic:claude-sonnet-4",
          },
        },
        latestVote: null,
      },
      stopGroup: vi.fn(),
      stopSession: vi.fn(),
      refetch: vi.fn(),
      isStoppingGroup: false,
      stoppingSessionIds: [],
      isLoading: false,
    });

    render(
      <ComparisonView
        assistantMessages={[
          {
            ...assistantMessages[0],
            content: "",
            status: "generating",
          },
          {
            ...assistantMessages[1],
            content: "",
            status: "generating",
          },
        ]}
        comparisonGroupId="cmp_1"
        showModelNames={true}
        onVote={vi.fn()}
        onConsolidate={vi.fn()}
        onToggleModelNames={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /mark tie/i })).toBeVisible();
  });
});

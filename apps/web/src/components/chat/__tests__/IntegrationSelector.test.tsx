import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  incognito: false,
  // SAFETY: synthetic selection IDs exercise the loading and selected states.
  selected: [] as string[] | undefined,
  toggle: vi.fn(),
  error: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(reference);
    if (name === "conversations:get") return { isIncognito: state.incognito };
    return name.endsWith("getSelectedIds")
      ? state.selected
      : [{ _id: "owned-connection", integrationName: "GitHub" }];
  },
  useMutation: () => state.toggle,
}));
vi.mock("sonner", () => ({ toast: { error: state.error } }));

import { IntegrationSelector } from "../IntegrationSelector";

// SAFETY: a synthetic branded ID is sent only to the mocked Convex mutation.
const conversationId = "test-chat" as Id<"conversations">;

describe("IntegrationSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.selected = [];
    state.incognito = false;
    state.toggle.mockResolvedValue(undefined);
  });

  it("explains that integrations are unavailable in incognito without offering choices", () => {
    state.incognito = true;
    render(
      <IntegrationSelector
        conversationId={conversationId}
        onSavingChange={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Integrations unavailable in incognito"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Select integrations for this chat",
      }),
    ).not.toBeInTheDocument();
    expect(state.toggle).not.toHaveBeenCalled();
  });

  it("does not present connections as selected just because they are connected", async () => {
    const user = userEvent.setup();
    render(
      <IntegrationSelector
        conversationId={conversationId}
        onSavingChange={vi.fn()}
      />,
    );
    expect(screen.getByText("No tools")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Select integrations for this chat" }),
    );
    expect(screen.getByRole("button", { name: "GitHub" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("blocks another toggle while saving and reports failures without inventing a selection", async () => {
    const user = userEvent.setup();
    const onSavingChange = vi.fn();
    let reject!: (reason: Error) => void;
    state.toggle.mockReturnValue(
      new Promise((_, rejectPromise) => {
        reject = rejectPromise;
      }),
    );
    render(
      <IntegrationSelector
        conversationId={conversationId}
        onSavingChange={onSavingChange}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Select integrations for this chat" }),
    );
    const connection = screen.getByRole("button", { name: "GitHub" });
    await user.click(connection);
    expect(connection).toBeDisabled();
    fireEvent.click(connection);
    expect(state.toggle).toHaveBeenCalledTimes(1);
    expect(state.toggle).toHaveBeenCalledWith({
      conversationId,
      connectionId: "owned-connection",
    });
    reject(new Error("active response"));
    await waitFor(() => expect(state.error).toHaveBeenCalledTimes(1));
    expect(onSavingChange.mock.calls).toEqual([[true], [false]]);
    expect(connection).toHaveAttribute("aria-pressed", "false");
  });
});

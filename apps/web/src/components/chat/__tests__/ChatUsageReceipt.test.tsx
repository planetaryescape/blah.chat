import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { fireEvent, render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatUsageReceipt } from "../ChatUsageReceipt";

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));

// SAFETY: opaque synthetic ID is used only with the mocked query boundary.
const messageId = "synthetic-message" as Id<"messages">;

describe("ChatUsageReceipt", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows estimated cost and unresolved coverage without implying zero", () => {
    vi.mocked(useQuery).mockReturnValue({
      status: "stopped",
      dispatchCount: 2,
      reportedDispatchCount: 1,
      estimatedDispatchCount: 0,
      unresolvedDispatchCount: 1,
      inputTokens: 80,
      outputTokens: 8,
      costUsd: 0.008,
      hasUnknownCost: true,
      hasUnknownUsage: true,
      measurement: "unknown",
    });

    render(<ChatUsageReceipt messageId={messageId} />);

    expect(
      screen.getByText(/Usage receipt · ≈\$0.008000 USD \+ unresolved cost/),
    ).toBeVisible();
    fireEvent.click(screen.getByText(/Usage receipt/));
    expect(
      screen.getByText(/80 input \/ 8 output tokens · 1 dispatch unresolved/),
    ).toBeVisible();
    expect(
      screen.getByText("Catalog estimates are not provider invoices."),
    ).toBeVisible();
    expect(
      screen.getByText(/Missing usage or rates are not zero/),
    ).toBeVisible();
  });

  it("does not present an unknown-only failed attempt as a free answer", () => {
    vi.mocked(useQuery).mockReturnValue({
      status: "error",
      costUsd: 0,
      hasUnknownCost: true,
      inputTokens: 0,
      outputTokens: 0,
      dispatchCount: 1,
      reportedDispatchCount: 0,
      unresolvedDispatchCount: 1,
      estimatedDispatchCount: 0,
    });
    render(<ChatUsageReceipt messageId={messageId} />);
    expect(screen.getByText(/Usage receipt · Cost unresolved/)).toBeVisible();
    expect(screen.queryByText(/0.000000 USD/)).not.toBeInTheDocument();
  });

  it("does not invent receipts for historical messages or unauthorized callers", () => {
    vi.mocked(useQuery).mockReturnValue(null);
    const view = render(<ChatUsageReceipt messageId={messageId} />);
    expect(view.container).toBeEmptyDOMElement();
  });
});

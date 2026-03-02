import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useStarterSuggestions", () => ({
  useStarterSuggestions: () => ({
    suggestions: [
      { id: "s1", text: "Prompt from hook one", icon: "sparkles" },
      { id: "s2", text: "Prompt from hook two", icon: "brain" },
      { id: "s3", text: "Prompt from hook three", icon: "zap" },
    ],
    visibleSuggestions: [
      { id: "s1", text: "Prompt from hook one", icon: "sparkles" },
      { id: "s2", text: "Prompt from hook two", icon: "brain" },
      { id: "s3", text: "Prompt from hook three", icon: "zap" },
    ],
    generatedAt: Date.now(),
    source: "cache",
    isLoading: false,
  }),
}));

import { EmptyScreen } from "../EmptyScreen";

describe("EmptyScreen", () => {
  it("renders dynamic suggestions from the starter suggestions hook", () => {
    render(<EmptyScreen onClick={vi.fn()} />);

    expect(screen.getByText("Prompt from hook one")).toBeInTheDocument();
    expect(screen.getByText("Prompt from hook three")).toBeInTheDocument();
  });

  it("calls onClick with the selected suggestion", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<EmptyScreen onClick={onClick} />);

    await user.click(screen.getByText("Prompt from hook three"));

    expect(onClick).toHaveBeenCalledWith("Prompt from hook three");
  });
});

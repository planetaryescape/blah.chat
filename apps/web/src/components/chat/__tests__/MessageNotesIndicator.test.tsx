import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import { MessageNotesIndicator } from "../MessageNotesIndicator";

describe("MessageNotesIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueryMock.mockReturnValue(null);
  });

  it("renders note count for convex message ids", () => {
    useQueryMock.mockReturnValue([
      { _id: "note1", title: "Note 1", createdAt: Date.now() },
    ]);

    render(<MessageNotesIndicator messageId="msg123" />);

    expect(screen.getByText("Notes (1)")).toBeInTheDocument();
  });

  it("skips rendering for postgres rewrite ids", () => {
    render(<MessageNotesIndicator messageId="Xjtnpfv9cM_HkeEKc9OjL" />);

    expect(useQueryMock).toHaveBeenCalledWith(expect.anything(), "skip");
    expect(screen.queryByText(/Notes \(/)).not.toBeInTheDocument();
  });
});

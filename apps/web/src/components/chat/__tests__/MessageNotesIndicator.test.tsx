import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/lib/test/render-helpers";

const mockListNotes = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/api/sdkClient", () => ({
  useSDKClient: () => ({
    listNotes: mockListNotes,
  }),
}));

import { MessageNotesIndicator } from "../MessageNotesIndicator";

describe("MessageNotesIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListNotes.mockResolvedValue([]);
  });

  it("renders note count for message ids with notes", async () => {
    mockListNotes.mockResolvedValue([
      {
        _id: "note1",
        title: "Note 1",
        createdAt: Date.now(),
        sourceMessageId: "msg123",
      },
    ]);

    renderWithProviders(<MessageNotesIndicator messageId="msg123" />);

    await waitFor(() => {
      expect(screen.getByText("Notes (1)")).toBeInTheDocument();
    });
  });

  it("does not render for temp message ids", () => {
    renderWithProviders(<MessageNotesIndicator messageId="temp-123" />);

    expect(screen.queryByText(/Notes \(/)).not.toBeInTheDocument();
  });
});

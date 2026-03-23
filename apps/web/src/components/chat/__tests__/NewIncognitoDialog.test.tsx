import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewIncognitoDialog } from "../NewIncognitoDialog";

const mockPost = vi.fn();
const mockPush = vi.fn();

vi.mock("@/lib/api/client", () => ({
  useApiClient: () => ({
    post: mockPost,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("NewIncognitoDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({
      _id: "conv_incognito_1",
    });
  });

  it("creates incognito conversations through the REST API", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<NewIncognitoDialog open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("switch", { name: /search your data/i }));
    await user.click(
      screen.getByRole("switch", { name: /custom instructions/i }),
    );
    await user.click(screen.getByRole("button", { name: /start/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/api/v1/conversations", {
        model: "auto",
        isIncognito: true,
        incognitoSettings: {
          enableReadTools: false,
          applyCustomInstructions: false,
          inactivityTimeoutMinutes: 30,
        },
      });
    });

    expect(mockPush).toHaveBeenCalledWith("/chat/conv_incognito_1");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

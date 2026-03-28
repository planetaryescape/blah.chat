import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/lib/test/render-helpers";

vi.mock("@/lib/analytics", () => ({
  analytics: { track: vi.fn() },
}));

// Mock clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
});

// Import AFTER mocks
import { ShareDialog } from "../ShareDialog";

describe("ShareDialog", () => {
  const conversationId = "conv123" as string;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/api/v1/shares") && !url.includes("?")) {
          return {
            ok: true,
            json: async () => ({
              status: "success",
              data: { shareId: "share-abc123" },
            }),
          };
        }
        // GET share query
        return {
          ok: false,
          json: async () => ({ status: "error" }),
        };
      }),
    );
  });

  it("dialog opens when trigger clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShareDialog conversationId={conversationId} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("Share Conversation")).toBeInTheDocument();
  });

  it("shows password input when no existing share", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShareDialog conversationId={conversationId} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("password input accepts text", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShareDialog conversationId={conversationId} />);

    await user.click(screen.getByRole("button"));

    const input = screen.getByLabelText(/password/i);
    await user.type(input, "secret123");

    expect(input).toHaveValue("secret123");
  });

  it("create share button calls fetch with correct args", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShareDialog conversationId={conversationId} />);

    await user.click(screen.getByRole("button")); // Open dialog

    const createButton = screen.getByRole("button", { name: /create share/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/shares",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  it("shows share URL input after creating share", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShareDialog conversationId={conversationId} />);

    await user.click(screen.getByRole("button")); // Open dialog
    await user.click(screen.getByRole("button", { name: /create share/i }));

    // After share creation, URL should appear in a readonly input
    await waitFor(() => {
      const urlInput = screen.getByDisplayValue(/share-abc123/);
      expect(urlInput).toBeInTheDocument();
    });
  });

  it("does not render for non-legacy conversation ids", () => {
    renderWithProviders(<ShareDialog conversationId="WRBHYWzRJwMeRigUQqMnq" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

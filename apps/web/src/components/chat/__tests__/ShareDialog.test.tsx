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

  it("queries existing share via /shares/by-conversation, not /shares?conversationId=", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShareDialog conversationId={conversationId} />);

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
      expect(
        calls.some((u) => u.includes("/api/v1/shares/by-conversation")),
      ).toBe(true);
      expect(
        calls.some((u) => /\/api\/v1\/shares\?conversationId=/.test(u)),
      ).toBe(false);
    });
  });

  it("toggle calls PATCH /api/v1/shares/<shareId> with {isActive}", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (url.includes("/api/v1/shares/by-conversation")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: "success",
              data: {
                shareId: "share-abc123",
                isActive: true,
                expiresAt: Date.now() + 86_400_000,
              },
            }),
          } as Response);
        }
        // PATCH /api/v1/shares/share-abc123
        if (url === "/api/v1/shares/share-abc123" && init?.method === "PATCH") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ status: "success" }),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          json: async () => ({ status: "error" }),
        } as Response);
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<ShareDialog conversationId={conversationId} />);
    await user.click(screen.getByRole("button"));

    // Wait for existing share fetch + UI
    const toggle = await screen.findByRole("switch");
    await user.click(toggle);

    await waitFor(() => {
      const patchCall = vi.mocked(fetch).mock.calls.find(([url, init]) => {
        return (
          String(url) === "/api/v1/shares/share-abc123" &&
          (init as RequestInit | undefined)?.method === "PATCH"
        );
      });
      expect(patchCall).toBeTruthy();
      const body = JSON.parse(String((patchCall![1] as RequestInit).body));
      expect(body).toEqual({ isActive: false });
    });
  });

  it("extend calls PATCH /api/v1/shares/<shareId> with {expiresAt}", async () => {
    const futureTs = Date.now() + 86_400_000;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (url.includes("/api/v1/shares/by-conversation")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: "success",
              data: {
                shareId: "share-abc123",
                isActive: true,
                // Expired so the "Extend Expiration" UI renders
                expiresAt: Date.now() - 1000,
              },
            }),
          } as Response);
        }
        if (url === "/api/v1/shares/share-abc123" && init?.method === "PATCH") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ status: "success" }),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          json: async () => ({ status: "error" }),
        } as Response);
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<ShareDialog conversationId={conversationId} />);
    await user.click(screen.getByRole("button"));

    const extendBtn = await screen.findByRole("button", {
      name: /^extend$/i,
    });
    await user.click(extendBtn);

    await waitFor(() => {
      const patchCall = vi.mocked(fetch).mock.calls.find(([url, init]) => {
        return (
          String(url) === "/api/v1/shares/share-abc123" &&
          (init as RequestInit | undefined)?.method === "PATCH"
        );
      });
      expect(patchCall).toBeTruthy();
      const body = JSON.parse(String((patchCall![1] as RequestInit).body));
      expect(body).toHaveProperty("expiresAt");
      expect(typeof body.expiresAt).toBe("number");
      // Reasonable future timestamp (relative to test start)
      expect(body.expiresAt).toBeGreaterThan(futureTs - 60_000);
    });
  });
});

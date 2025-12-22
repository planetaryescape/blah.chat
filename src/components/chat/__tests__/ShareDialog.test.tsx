import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks
const { mockCreateShare, mockToggleShare, mockExistingShare } = vi.hoisted(
  () => ({
    mockCreateShare: vi.fn(),
    mockToggleShare: vi.fn(),
    mockExistingShare: {
      current: null as {
        shareId: string;
        isActive: boolean;
        password?: string;
        expiresAt?: number;
      } | null,
    },
  }),
);

vi.mock("convex/react", () => ({
  useQuery: () => mockExistingShare.current,
  useAction: () => mockCreateShare,
  useMutation: () => mockToggleShare,
}));

vi.mock("@/lib/analytics", () => ({
  analytics: { track: vi.fn() },
}));

// Mock clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
});

// Import AFTER mocks
import type { Id } from "@/convex/_generated/dataModel";
import { ShareDialog } from "../ShareDialog";

describe("ShareDialog", () => {
  const conversationId = "conv-123" as Id<"conversations">;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistingShare.current = null;
    mockCreateShare.mockResolvedValue("share-abc123");
  });

  it("dialog opens when trigger clicked", async () => {
    const user = userEvent.setup();
    render(<ShareDialog conversationId={conversationId} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("Share Conversation")).toBeInTheDocument();
  });

  it("shows password input when no existing share", async () => {
    const user = userEvent.setup();
    render(<ShareDialog conversationId={conversationId} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("password input accepts text", async () => {
    const user = userEvent.setup();
    render(<ShareDialog conversationId={conversationId} />);

    await user.click(screen.getByRole("button"));

    const input = screen.getByLabelText(/password/i);
    await user.type(input, "secret123");

    expect(input).toHaveValue("secret123");
  });

  it("create share button calls action", async () => {
    const user = userEvent.setup();
    render(<ShareDialog conversationId={conversationId} />);

    await user.click(screen.getByRole("button")); // Open dialog

    const createButton = screen.getByRole("button", { name: /create share/i });
    await user.click(createButton);

    expect(mockCreateShare).toHaveBeenCalledWith({
      conversationId,
      password: undefined,
      expiresIn: 7,
      anonymizeUsernames: false,
    });
  });

  it("shows share URL input after creating share", async () => {
    const user = userEvent.setup();
    render(<ShareDialog conversationId={conversationId} />);

    await user.click(screen.getByRole("button")); // Open dialog
    await user.click(screen.getByRole("button", { name: /create share/i }));

    // After share creation, URL should appear in a readonly input
    const urlInput = await screen.findByDisplayValue(/share-abc123/);
    expect(urlInput).toBeInTheDocument();
  });

  it("shows existing share URL when share exists", async () => {
    mockExistingShare.current = {
      shareId: "existing-share",
      isActive: true,
    };

    const user = userEvent.setup();
    render(<ShareDialog conversationId={conversationId} />);

    await user.click(screen.getByRole("button"));

    // Should show share URL input
    const urlInput = screen.getByDisplayValue(/existing-share/);
    expect(urlInput).toBeInTheDocument();
  });
});

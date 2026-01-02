import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks
const {
  mockHandleTogglePin,
  mockHandleToggleStar,
  mockHandleArchive,
  mockHandleDelete,
  mockHandleAutoRename,
  mockUpdatePreferences,
  mockRouterPush,
} = vi.hoisted(() => ({
  mockHandleTogglePin: vi.fn(),
  mockHandleToggleStar: vi.fn(),
  mockHandleArchive: vi.fn(),
  mockHandleDelete: vi.fn(),
  mockHandleAutoRename: vi.fn(),
  mockUpdatePreferences: vi.fn(),
  mockRouterPush: vi.fn(),
}));

vi.mock("@/hooks/useConversationActions", () => ({
  useConversationActions: () => ({
    handleTogglePin: mockHandleTogglePin,
    handleToggleStar: mockHandleToggleStar,
    handleArchive: mockHandleArchive,
    handleDelete: mockHandleDelete,
    handleAutoRename: mockHandleAutoRename,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useFeatureToggles", () => ({
  useFeatureToggles: () => ({ showSlides: false }),
}));

vi.mock("@/hooks/useUserPreference", () => ({
  useUserPreference: (key: string) => {
    if (key === "chatWidth") return "standard";
    if (key === "showMessageStatistics") return false;
    if (key === "showComparisonStatistics") return false;
    return null;
  },
}));

vi.mock("convex/react", () => ({
  useQuery: () => ({ _id: "user-123" }),
  useMutation: () => mockUpdatePreferences,
  useAction: () => vi.fn().mockResolvedValue({ conversationId: "new-conv-123" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/analytics", () => ({
  analytics: { track: vi.fn() },
}));

// Import AFTER mocks
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { ConversationHeaderMenu } from "../ConversationHeaderMenu";

const createConversation = (
  overrides: Partial<Doc<"conversations">> = {},
): Doc<"conversations"> =>
  ({
    _id: "conv-123" as Id<"conversations">,
    _creationTime: Date.now(),
    userId: "user-123" as Id<"users">,
    title: "Test Conversation",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 5,
    pinned: false,
    starred: false,
    archived: false,
    ...overrides,
  }) as Doc<"conversations">;

describe("ConversationHeaderMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menu opens on trigger click", async () => {
    const user = userEvent.setup();
    render(<ConversationHeaderMenu conversation={createConversation()} />);

    await user.click(
      screen.getByRole("button", { name: /conversation options/i }),
    );

    expect(
      screen.getByRole("menuitem", { name: /^rename$/i }),
    ).toBeInTheDocument();
  });

  it("rename menu item is present", async () => {
    const user = userEvent.setup();
    render(<ConversationHeaderMenu conversation={createConversation()} />);

    await user.click(
      screen.getByRole("button", { name: /conversation options/i }),
    );

    expect(
      screen.getByRole("menuitem", { name: /^rename$/i }),
    ).toBeInTheDocument();
  });

  it("delete menu item is present", async () => {
    const user = userEvent.setup();
    render(<ConversationHeaderMenu conversation={createConversation()} />);

    await user.click(
      screen.getByRole("button", { name: /conversation options/i }),
    );

    expect(
      screen.getByRole("menuitem", { name: /delete/i }),
    ).toBeInTheDocument();
  });

  it("pin menu item calls handleTogglePin", async () => {
    const user = userEvent.setup();
    render(<ConversationHeaderMenu conversation={createConversation()} />);

    await user.click(
      screen.getByRole("button", { name: /conversation options/i }),
    );
    await user.click(screen.getByRole("menuitem", { name: /^pin$/i }));

    expect(mockHandleTogglePin).toHaveBeenCalledWith(false);
  });

  it("star menu item calls handleToggleStar", async () => {
    const user = userEvent.setup();
    render(<ConversationHeaderMenu conversation={createConversation()} />);

    await user.click(
      screen.getByRole("button", { name: /conversation options/i }),
    );
    await user.click(screen.getByRole("menuitem", { name: /star/i }));

    expect(mockHandleToggleStar).toHaveBeenCalledWith(false);
  });

  it("archive menu item calls handleArchive", async () => {
    const user = userEvent.setup();
    render(<ConversationHeaderMenu conversation={createConversation()} />);

    await user.click(
      screen.getByRole("button", { name: /conversation options/i }),
    );
    await user.click(screen.getByRole("menuitem", { name: /archive/i }));

    expect(mockHandleArchive).toHaveBeenCalled();
  });

  it("shows unpin when conversation is pinned", async () => {
    const user = userEvent.setup();
    render(
      <ConversationHeaderMenu
        conversation={createConversation({ pinned: true })}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /conversation options/i }),
    );

    expect(
      screen.getByRole("menuitem", { name: /unpin/i }),
    ).toBeInTheDocument();
  });

  it("shows unstar when conversation is starred", async () => {
    const user = userEvent.setup();
    render(
      <ConversationHeaderMenu
        conversation={createConversation({ starred: true })}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /conversation options/i }),
    );

    expect(
      screen.getByRole("menuitem", { name: /unstar/i }),
    ).toBeInTheDocument();
  });
});

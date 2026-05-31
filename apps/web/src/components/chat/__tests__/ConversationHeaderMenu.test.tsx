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
  mockApiGet,
  mockApiPost,
  mockExtractMemories,
  mockRouterPush,
} = vi.hoisted(() => ({
  mockHandleTogglePin: vi.fn(),
  mockHandleToggleStar: vi.fn(),
  mockHandleArchive: vi.fn(),
  mockHandleDelete: vi.fn(),
  mockHandleAutoRename: vi.fn(),
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
  mockExtractMemories: vi.fn(),
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
  useFeatureToggles: () => ({}),
}));

vi.mock("@/hooks/useUserPreference", () => ({
  useUserPreference: (key: string) => {
    if (key === "chatWidth") return "standard";
    if (key === "showMessageStatistics") return false;
    if (key === "showComparisonStatistics") return false;
    return null;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@/lib/api/client", () => ({
  useApiClient: () => ({
    get: mockApiGet,
    post: mockApiPost,
  }),
}));

vi.mock("@/lib/api/sdkClient", () => ({
  useSDKClient: () => ({
    extractMemories: mockExtractMemories,
  }),
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

vi.mock("@/components/sidebar/RenameDialog", () => ({
  RenameDialog: () => null,
}));

vi.mock("@/components/sidebar/DeleteConversationDialog", () => ({
  DeleteConversationDialog: () => null,
}));

// Import AFTER mocks
import { ConversationHeaderMenu } from "../ConversationHeaderMenu";

const createConversation = (overrides: Partial<any> = {}): any =>
  ({
    _id: "conv-123" as string,
    _creationTime: Date.now(),
    userId: "user-123" as string,
    title: "Test Conversation",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 5,
    pinned: false,
    starred: false,
    archived: false,
    ...overrides,
  }) as any;

describe("ConversationHeaderMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue([]);
    mockApiPost.mockResolvedValue({ conversationId: "conv-123" });
    mockExtractMemories.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn(),
      },
      configurable: true,
    });
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

  it("copies conversation markdown using v1 messages and sources routes", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText,
      },
      configurable: true,
    });
    mockApiGet
      .mockResolvedValueOnce([
        {
          data: {
            _id: "msg-1",
            role: "assistant",
            content: "Answer body",
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          data: {
            messageId: "msg-1",
            position: 1,
            title: "Rewrite Spec",
            url: "https://example.com/spec",
          },
        },
      ]);

    render(<ConversationHeaderMenu conversation={createConversation()} />);

    await user.click(
      screen.getByRole("button", { name: /conversation options/i }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: /copy conversation/i }),
    );

    expect(mockApiGet).toHaveBeenNthCalledWith(
      1,
      "/api/v1/conversations/conv-123/messages",
    );
    expect(mockApiGet).toHaveBeenNthCalledWith(
      2,
      "/api/v1/conversations/conv-123/sources",
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Rewrite Spec"),
    );
  });
});

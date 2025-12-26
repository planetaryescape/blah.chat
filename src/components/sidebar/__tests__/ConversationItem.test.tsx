import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock convex/react BEFORE importing component
const mockMutation = vi.fn();
const mockAction = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => null),
  useMutation: vi.fn(() => mockMutation),
  useAction: vi.fn(() => mockAction),
}));

// Mock nuqs
vi.mock("nuqs", () => ({
  useQueryState: vi.fn(() => [null, vi.fn()]),
}));

// Mock feature toggles
vi.mock("@/hooks/useFeatureToggles", () => ({
  useFeatureToggles: () => ({ showProjects: false }),
}));

// Mock child dialogs
vi.mock("../RenameDialog", () => ({
  RenameDialog: () => null,
}));

vi.mock("../DeleteConversationDialog", () => ({
  DeleteConversationDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: () => void;
  }) =>
    open ? (
      <div data-testid="delete-dialog">
        <button onClick={onConfirm}>Confirm Delete</button>
      </div>
    ) : null,
}));

// Mock ConversationPrefetcher to avoid ConvexQueryCacheContext issues
vi.mock("../ConversationPrefetcher", () => ({
  ConversationPrefetcher: () => null,
}));

import type { Doc, Id } from "@/convex/_generated/dataModel";
// Import AFTER mocks
import { ConversationItem } from "../ConversationItem";

// Access mocked router
const mockRouterPush = vi.fn();
const mockRouterPrefetch = vi.fn();
vi.mock("next/navigation", async () => {
  return {
    useRouter: () => ({ push: mockRouterPush, prefetch: mockRouterPrefetch }),
    usePathname: () => "/chat/other-id",
  };
});

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

describe("ConversationItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates to conversation on click", async () => {
    const user = userEvent.setup();
    const conversation = createConversation();

    render(<ConversationItem conversation={conversation} />);

    const item = screen.getByRole("option");
    await user.click(item);

    expect(mockRouterPush).toHaveBeenCalledWith("/chat/conv-123");
  });

  it("shows aria-selected when selected", () => {
    const conversation = createConversation();

    render(
      <ConversationItem conversation={conversation} selectedId="conv-123" />,
    );

    const item = screen.getByRole("option");
    expect(item).toHaveAttribute("aria-selected", "true");
  });

  it("shows checkbox in selection mode", () => {
    const conversation = createConversation();

    render(
      <ConversationItem
        conversation={conversation}
        isSelectionMode={true}
        isSelectedById={false}
        onToggleSelection={vi.fn()}
      />,
    );

    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("calls onToggleSelection when checkbox clicked", async () => {
    const user = userEvent.setup();
    const onToggleSelection = vi.fn();
    const conversation = createConversation();

    render(
      <ConversationItem
        conversation={conversation}
        isSelectionMode={true}
        isSelectedById={false}
        onToggleSelection={onToggleSelection}
      />,
    );

    await user.click(screen.getByRole("checkbox"));
    expect(onToggleSelection).toHaveBeenCalledWith("conv-123");
  });

  it("opens dropdown menu on options button click", async () => {
    const user = userEvent.setup();
    const conversation = createConversation();

    render(<ConversationItem conversation={conversation} />);

    const optionsButton = screen.getByRole("button", { name: /options/i });
    await user.click(optionsButton);

    // Dropdown menu items should be visible - use exact text to avoid "Auto-rename"
    expect(
      screen.getByRole("menuitem", { name: /^Rename$/ }),
    ).toBeInTheDocument();
  });

  it("calls mutation when pin button clicked", async () => {
    const user = userEvent.setup();
    const conversation = createConversation({ messageCount: 5 });

    render(<ConversationItem conversation={conversation} />);

    const pinButton = screen.getByRole("button", { name: /pin/i });
    await user.click(pinButton);

    expect(mockMutation).toHaveBeenCalledWith({ conversationId: "conv-123" });
  });

  it("shows delete dialog and calls mutation on confirm", async () => {
    const user = userEvent.setup();
    const conversation = createConversation();

    render(<ConversationItem conversation={conversation} />);

    // Open dropdown and click delete
    const optionsButton = screen.getByRole("button", { name: /options/i });
    await user.click(optionsButton);

    const deleteItem = screen.getByText(/delete/i);
    await user.click(deleteItem);

    // Dialog should appear
    expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();

    // Confirm delete
    await user.click(screen.getByText("Confirm Delete"));
    expect(mockMutation).toHaveBeenCalledWith({
      conversationId: "conv-123",
    });
  });

  it("navigates on Enter key press", async () => {
    const user = userEvent.setup();
    const conversation = createConversation();

    render(<ConversationItem conversation={conversation} />);

    const item = screen.getByRole("option");
    item.focus();
    await user.keyboard("{Enter}");

    expect(mockRouterPush).toHaveBeenCalledWith("/chat/conv-123");
  });
});

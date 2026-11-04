import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMutation, useQuery } from "convex/react";
import { getFunctionName } from "convex/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const retryMutation = vi.fn();
const toastError = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(() => null),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));
vi.mock("@/hooks/useFeatureToggles", () => ({ useFeatureToggles: () => ({}) }));
vi.mock("@/hooks/useHaptic", () => ({
  useHaptic: () => ({ haptic: vi.fn() }),
}));
vi.mock("@/hooks/useMobileDetect", () => ({
  useMobileDetect: () => ({ isMobile: false }),
}));
vi.mock("@/hooks/useUserPreference", () => ({
  useUserPreference: () => false,
}));
vi.mock("@/components/notes/CreateNoteDialog", () => ({
  CreateNoteDialog: () => null,
}));
vi.mock("../BookmarkButton", () => ({ BookmarkButton: () => null }));
vi.mock("../MessageActionsMenu", () => ({ MessageActionsMenu: () => null }));
vi.mock("../MessageActionsMenuMobile", () => ({
  MessageActionsMenuMobile: () => null,
}));
vi.mock("../QuickModelSwitcher", () => ({ QuickModelSwitcher: () => null }));
vi.mock("../TTSButton", () => ({ TTSButton: () => null }));
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { MessageActions } from "../MessageActions";

const user = {
  _id: "user-message" as Id<"messages">,
  role: "user",
  status: "complete",
  content: "Question A",
} as Doc<"messages">;
const failedAssistant = {
  _id: "failed-assistant" as Id<"messages">,
  role: "assistant",
  status: "error",
  content: "partial A",
} as Doc<"messages">;

describe("MessageActions retry handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockImplementation((reference) =>
      getFunctionName(reference) === "chat:retryMessage"
        ? Object.assign(retryMutation, { withOptimisticUpdate: vi.fn() })
        : Object.assign(vi.fn(), { withOptimisticUpdate: vi.fn() }),
    );
    vi.mocked(useQuery).mockReturnValue(null);
  });

  it("submits the exact failed assistant target and shows an error toast on rejection", async () => {
    retryMutation.mockRejectedValue(new Error("retry denied"));
    render(<MessageActions message={user} nextMessage={failedAssistant} />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(retryMutation).toHaveBeenCalledWith({
        messageId: user._id,
        failedMessageId: failedAssistant._id,
      });
      expect(toastError).toHaveBeenCalledWith("Failed to retry generation");
    });
  });

  it.each([
    ["a user message", { ...failedAssistant, role: "user" }],
    ["a successful assistant", { ...failedAssistant, status: "complete" }],
  ])("does not offer retry for %s", (_description, nextMessage) => {
    render(
      <MessageActions
        message={user}
        nextMessage={nextMessage as Doc<"messages">}
      />,
    );

    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(retryMutation).not.toHaveBeenCalled();
  });
});

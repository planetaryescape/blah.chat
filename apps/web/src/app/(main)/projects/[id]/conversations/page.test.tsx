import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const postMock = vi.fn();
const hybridSearchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("use-debounce", () => ({
  useDebouncedCallback: <T extends (...args: any[]) => unknown>(fn: T) => fn,
}));

vi.mock("@/hooks/useRestConversationSync", () => ({
  useRestConversationSync: () => ({
    conversations: [],
    isLoading: false,
  }),
}));

vi.mock("@/lib/api/client", () => ({
  useApiClient: () => ({
    post: postMock,
  }),
}));

vi.mock("@tanstack/react-virtual", async () => {
  const actual = await vi.importActual<
    typeof import("@tanstack/react-virtual")
  >("@tanstack/react-virtual");

  return {
    ...actual,
    useVirtualizer: () => ({
      getTotalSize: () => 0,
      getVirtualItems: () => [],
      measureElement: vi.fn(),
    }),
  };
});

import ProjectConversationsPage from "./page";

describe("ProjectConversationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postMock.mockResolvedValue({ _id: "conv_123" });
    hybridSearchMock.mockResolvedValue([]);
  });

  it("creates project conversations through REST with projectId", async () => {
    await act(async () => {
      render(
        <Suspense fallback={null}>
          <ProjectConversationsPage
            params={Promise.resolve({ id: "project_123" })}
          />
        </Suspense>,
      );
      await Promise.resolve();
    });

    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: /start a new chat/i }),
    );

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith("/api/v1/conversations", {
        model: "zai:glm-4.6v-flash",
        title: "New Project Chat",
        projectId: "project_123",
      });
    });

    expect(pushMock).toHaveBeenCalledWith("/chat/conv_123");
  });
});

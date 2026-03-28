import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWrapper } from "@/lib/test/render-helpers";

const mockGetStarterSuggestions = vi.fn();
const mockRefreshStarterSuggestions = vi.fn();

vi.mock("@/lib/api/sdkClient", () => ({
  useSDKClient: () => ({
    getStarterSuggestions: mockGetStarterSuggestions,
    refreshStarterSuggestions: mockRefreshStarterSuggestions,
  }),
}));

import { useStarterSuggestions } from "../useStarterSuggestions";

describe("useStarterSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers refresh exactly once when needsRefresh is true", async () => {
    mockGetStarterSuggestions.mockResolvedValue({
      suggestions: [
        { id: "1", text: "First prompt", icon: "sparkles" },
        { id: "2", text: "Second prompt", icon: "brain" },
        { id: "3", text: "Third prompt", icon: "zap" },
        { id: "4", text: "Fourth prompt", icon: "penLine" },
        { id: "5", text: "Fifth prompt", icon: "sparkles" },
      ],
      needsRefresh: true,
      generatedAt: 123,
      source: "cache",
    });
    mockRefreshStarterSuggestions.mockResolvedValue(undefined);

    const { rerender } = renderHook(() => useStarterSuggestions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockRefreshStarterSuggestions).toHaveBeenCalledTimes(1);
    });

    rerender();
    expect(mockRefreshStarterSuggestions).toHaveBeenCalledTimes(1);
  });
});

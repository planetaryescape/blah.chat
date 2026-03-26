import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useActionMock = vi.fn();

import { useStarterSuggestions } from "../useStarterSuggestions";

describe("useStarterSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers refresh exactly once when needsRefresh is true", async () => {
    const refreshMock = vi.fn().mockResolvedValue(undefined);

    useActionMock.mockReturnValue(refreshMock);
    useQueryMock.mockReturnValue({
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

    const { rerender } = renderHook(() => useStarterSuggestions());

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });

    rerender();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});

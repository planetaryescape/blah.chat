import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import {
  updatePreferenceCache,
  useUserPreference,
  useUserPreferencesByCategory,
} from "@/hooks/useUserPreference";

const { mockGet, mockCacheGet, mockCachePut, liveQueryState } = vi.hoisted(
  () => ({
    mockGet: vi.fn(),
    mockCacheGet: vi.fn(),
    mockCachePut: vi.fn(),
    liveQueryState: {
      value: null as { _id: string; data: Record<string, unknown> } | null,
    },
  }),
);

vi.mock("@/lib/api/client", () => ({
  useApiClient: () => ({
    get: mockGet,
  }),
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(() => liveQueryState.value),
}));

vi.mock("@/lib/cache", () => ({
  cache: {
    userPreferences: {
      get: mockCacheGet,
      put: mockCachePut,
    },
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useUserPreference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    liveQueryState.value = null;
    mockCacheGet.mockResolvedValue(null);
  });

  it("returns server preferences and syncs them into cache", async () => {
    mockGet.mockResolvedValue({
      defaultModel: "openai:gpt-4.1",
    });

    const { result } = renderHook(() => useUserPreference("defaultModel"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe("openai:gpt-4.1");
    });

    expect(mockCachePut).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "current",
        data: expect.objectContaining({
          defaultModel: "openai:gpt-4.1",
        }),
      }),
    );
  });

  it("prefers cached preferences for immediate reads", () => {
    liveQueryState.value = {
      _id: "current",
      data: {
        defaultModel: "cached-model",
      },
    };
    mockGet.mockResolvedValue({
      defaultModel: "server-model",
    });

    const { result } = renderHook(() => useUserPreference("defaultModel"), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe("cached-model");
  });

  it("derives preference categories client-side", async () => {
    mockGet.mockResolvedValue({
      sttEnabled: false,
      ttsEnabled: true,
      defaultModel: "ignored",
    });

    const { result } = renderHook(() => useUserPreferencesByCategory("audio"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          sttEnabled: false,
          ttsEnabled: true,
        }),
      );
    });
    expect(result.current).not.toHaveProperty("defaultModel");
  });

  it("updates cached preferences optimistically", async () => {
    mockCacheGet.mockResolvedValue({
      _id: "current",
      data: {
        showMessageStatistics: false,
      },
    });

    await updatePreferenceCache("showMessageStatistics", true);

    expect(mockCachePut).toHaveBeenCalledWith({
      _id: "current",
      data: {
        showMessageStatistics: true,
      },
    });
  });
});

describe("useFeatureToggles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    liveQueryState.value = null;
    mockCacheGet.mockResolvedValue(null);
  });

  it("falls back to defaults while preferences are loading", () => {
    mockGet.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useFeatureToggles(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.showNotes).toBe(true);
    expect(result.current.showTemplates).toBe(true);
    expect(result.current.showProjects).toBe(true);
    expect(result.current.showBookmarks).toBe(true);
  });
});

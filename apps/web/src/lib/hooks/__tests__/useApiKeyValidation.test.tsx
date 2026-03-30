import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const getByokConfigMock = vi.fn();

vi.mock("@/lib/api/client", () => {
  class ApiClientError extends Error {
    constructor(
      public status: number,
      public code?: string,
      message?: string,
    ) {
      super(message || `API Error: ${status}`);
      this.name = "ApiClientError";
    }
  }

  return {
    ApiClientError,
    useApiClient: () => ({
      get: getMock,
    }),
  };
});

vi.mock("@/lib/api/sdkClient", () => ({
  useSDKClient: () => ({
    getByokConfig: getByokConfigMock,
  }),
}));

import { ApiClientError } from "@/lib/api/client";
import { useApiKeyValidation } from "../useApiKeyValidation";

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

describe("useApiKeyValidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getByokConfigMock.mockResolvedValue({
      byokEnabled: false,
      hasVercelGatewayKey: false,
      hasOpenRouterKey: false,
      hasGroqKey: false,
      hasDeepgramKey: false,
    });
  });

  it("falls back cleanly when the availability route is missing", async () => {
    getMock.mockRejectedValueOnce(
      new ApiClientError(404, "NOT_FOUND", "Route missing"),
    );

    const { result, rerender } = renderHook(() => useApiKeyValidation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stt.enabled).toBe(true);
    expect(result.current.tts.enabled).toBe(true);
    expect(getMock).toHaveBeenCalledTimes(1);

    rerender();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it("disables voice features when the availability route errors", async () => {
    getMock.mockRejectedValueOnce(
      new ApiClientError(500, "SERVER_ERROR", "Boom"),
    );

    const { result } = renderHook(() => useApiKeyValidation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stt.enabled).toBe(false);
    expect(result.current.tts.enabled).toBe(false);
    expect(result.current.getSTTErrorMessage()).toBe(
      "Speech-to-text is currently unavailable. Please try again shortly.",
    );
    expect(result.current.getTTSErrorMessage()).toBe(
      "Text-to-speech is currently unavailable. Please try again shortly.",
    );
  });
});

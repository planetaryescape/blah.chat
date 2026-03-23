import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mutationConfig: null | {
  mutationFn?: (args: unknown) => Promise<unknown>;
} = null;

const extractMemoriesMock = vi.fn();
const usePollJobMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn((config: typeof mutationConfig) => {
    mutationConfig = config;
    return {
      mutateAsync: config?.mutationFn,
      isPending: false,
    };
  }),
}));

vi.mock("@/lib/api/sdkClient", () => ({
  useSDKClient: () => ({
    extractMemories: extractMemoriesMock,
  }),
}));

vi.mock("../../usePollJob", () => ({
  usePollJob: (...args: unknown[]) => usePollJobMock(...args),
}));

import {
  useExtractMemories,
  useExtractMemoriesWithSSE,
} from "../useExtractMemories";

describe("useExtractMemories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationConfig = null;
    extractMemoriesMock.mockResolvedValue({
      jobId: "run_mem_123",
      status: "pending",
      pollUrl: "/api/v1/actions/jobs/run_mem_123",
    });
    usePollJobMock.mockReturnValue({
      result: undefined,
      progress: undefined,
      error: null,
      status: "pending",
      isRunning: false,
      isPending: false,
    });
  });

  it("starts extraction through the REST SDK and returns the job id", async () => {
    renderHook(() => useExtractMemories());

    const jobId = await mutationConfig?.mutationFn?.({
      conversationId: "conv_1",
    });

    expect(jobId).toBe("run_mem_123");
    expect(extractMemoriesMock).toHaveBeenCalledWith("conv_1");
  });

  it("tracks the returned job id via polling in the compatibility hook", async () => {
    const { result } = renderHook(() => useExtractMemoriesWithSSE());

    await act(async () => {
      await result.current.extract("conv_2");
    });

    await waitFor(() => {
      expect(usePollJobMock).toHaveBeenLastCalledWith(
        "run_mem_123",
        expect.objectContaining({
          enabled: true,
          initialInterval: 1000,
          maxInterval: 5000,
          backoffMultiplier: 1.5,
        }),
      );
    });
  });
});

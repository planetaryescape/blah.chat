import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useSDKClient } from "@/lib/api/sdkClient";
import { usePollJob } from "../usePollJob";

interface ExtractMemoriesInput {
  conversationId: string;
}

interface ExtractMemoriesResult {
  extracted: number;
}

interface ExtractMemoriesProgress {
  current: number;
  message: string;
  eta?: number;
}

export function useExtractMemories() {
  const sdk = useSDKClient();

  return useMutation({
    mutationFn: async (input: ExtractMemoriesInput) =>
      (await sdk.extractMemories(input.conversationId)).jobId,
  });
}

/**
 * Compatibility wrapper for older consumers.
 * The route now returns a job envelope by default, so this hook tracks it via polling.
 */
export function useExtractMemoriesWithSSE() {
  const [jobId, setJobId] = useState<string | null>(null);
  const extractMutation = useExtractMemories();
  const {
    result,
    progress,
    error: jobError,
    status,
    isRunning,
    isPending,
  } = usePollJob<ExtractMemoriesResult>(jobId, {
    enabled: !!jobId,
    initialInterval: 1000,
    maxInterval: 5000,
    backoffMultiplier: 1.5,
  });

  const extract = useCallback(
    async (conversationId: string) => {
      const nextJobId = await extractMutation.mutateAsync({ conversationId });
      setJobId(nextJobId);
    },
    [extractMutation],
  );

  return {
    extract,
    isExtracting: extractMutation.isPending || isPending || isRunning,
    extracted: result?.extracted ?? null,
    progress: progress as ExtractMemoriesProgress | undefined,
    error: jobError || extractMutation.error,
    jobStatus: status,
    strategy: "polling" as const,
    reset: () => {
      setJobId(null);
    },
  };
}

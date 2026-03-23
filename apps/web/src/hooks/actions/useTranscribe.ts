import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useSDKClient } from "@/lib/api/sdkClient";
import { usePollJob } from "../usePollJob";

interface TranscribeJobInput {
  storageId: string;
  mimeType?: string;
  model?: "whisper-1" | "whisper-large-v3";
}

interface TranscribeJobResult {
  text: string;
  duration?: number;
  cost?: number;
}

/**
 * Trigger transcription job creation
 */
export function useTranscribe() {
  const sdk = useSDKClient();

  return useMutation({
    mutationFn: async (input: TranscribeJobInput) =>
      (await sdk.transcribeAudio(input)).jobId,
  });
}

/**
 * Convenience hook combining creation + polling with exponential backoff
 * Tier 3: Long-running transcription (30-90s)
 */
export function useTranscribeWithPolling() {
  const [jobId, setJobId] = useState<string | null>(null);
  const transcribeMutation = useTranscribe();

  const {
    result,
    progress,
    error: jobError,
    status,
    isRunning,
    isPending,
  } = usePollJob<TranscribeJobResult>(jobId, {
    enabled: !!jobId,
    initialInterval: 1000, // Start at 1s
    maxInterval: 10000, // Max 10s
    backoffMultiplier: 1.5, // 1s → 1.5s → 2.25s → ...
  });

  const transcribe = async (
    storageId: string,
    model?: string,
    mimeType?: string,
  ) => {
    const id = await transcribeMutation.mutateAsync({
      storageId,
      mimeType,
      model: model as "whisper-1" | "whisper-large-v3" | undefined,
    });
    setJobId(id);
  };

  return {
    transcribe,
    isTranscribing: transcribeMutation.isPending || isPending || isRunning,
    transcript: result?.text,
    duration: result?.duration,
    cost: result?.cost,
    progress,
    error: jobError || transcribeMutation.error,
    jobStatus: status,
    reset: () => setJobId(null),
  };
}

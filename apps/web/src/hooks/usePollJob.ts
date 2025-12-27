import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export interface UsePollJobOptions {
  enabled?: boolean;
  initialInterval?: number; // ms
  maxInterval?: number; // ms
  backoffMultiplier?: number;
  onComplete?: (result: any) => void;
  onError?: (error: any) => void;
}

/**
 * Poll job status with exponential backoff
 * Tier 3 pattern: Long-running operations (30s+)
 *
 * Features:
 * - Exponential backoff: 1s → 1.5s → 2.25s → ... → 10s max
 * - Auto-stop on completion/failure
 * - Mobile-friendly (pauses when backgrounded)
 * - Battery efficient (increasing intervals)
 */
export function usePollJob<TResult = any>(
  jobId: string | null,
  options: UsePollJobOptions = {},
) {
  const {
    enabled = true,
    initialInterval = 1000,
    maxInterval = 10000,
    backoffMultiplier = 1.5,
    onComplete,
    onError,
  } = options;

  const [pollInterval, setPollInterval] = useState(initialInterval);
  const previousStatus = useRef<string | null>(null);

  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      if (!jobId) return null;

      const response = await fetch(`/api/v1/actions/jobs/${jobId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch job");
      }

      const envelope = await response.json();
      return envelope.data as Doc<"jobs">;
    },
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data;

      // Stop polling if no job or terminal state
      if (
        !job ||
        job.status === "completed" ||
        job.status === "failed" ||
        job.status === "cancelled"
      ) {
        return false;
      }

      return pollInterval;
    },
    refetchIntervalInBackground: false, // Pause when tab backgrounded (mobile battery saving)
    refetchOnWindowFocus: true, // Resume when tab focused
    staleTime: 0, // Always refetch
    retry: 3, // Retry failed requests 3 times
  });

  // Exponential backoff when job is running
  useEffect(() => {
    if (data?.status === "running" && previousStatus.current !== "running") {
      // Job just started running, increase interval
      setPollInterval((prev) =>
        Math.min(prev * backoffMultiplier, maxInterval),
      );
    }

    // Reset interval if job goes back to pending (edge case)
    if (data?.status === "pending" && previousStatus.current === "running") {
      setPollInterval(initialInterval);
    }

    previousStatus.current = data?.status || null;
  }, [data?.status, backoffMultiplier, maxInterval, initialInterval]);

  // Completion callback
  useEffect(() => {
    if (data?.status === "completed" && onComplete) {
      onComplete(data.result);
    }

    if (data?.status === "failed" && onError) {
      onError(data.error);
    }
  }, [data?.status, data?.result, data?.error, onComplete, onError]);

  return {
    job: data,
    isLoading,
    isFetching,
    error,
    status: data?.status,
    result: data?.result as TResult | undefined,
    progress: data?.progress,
    isPending: data?.status === "pending",
    isRunning: data?.status === "running",
    isCompleted: data?.status === "completed",
    isFailed: data?.status === "failed",
    currentInterval: pollInterval,
  };
}

import { useMutation } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { useSSE } from "../useSSE";

interface ExtractMemoriesInput {
  conversationId: string;
}

interface ExtractMemoriesResult {
  extracted: number;
}

interface ExtractMemoriesProgress {
  jobId: string;
  current: number;
  message: string;
  eta?: number;
}

/**
 * Trigger memory extraction job creation
 * Tier 2: Uses SSE streaming with progress updates
 */
export function useExtractMemories() {
  return useMutation({
    mutationFn: async (input: ExtractMemoriesInput) => {
      const res = await fetch("/api/v1/memories/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) throw new Error("Memory extraction failed");

      // For SSE endpoints, we don't get a jobId response
      // The SSE stream will handle completion
      return null;
    },
  });
}

/**
 * Convenience hook using SSE streaming with automatic polling fallback
 * Tier 2: Medium-duration operations (5-30s) with real-time progress
 *
 * Example usage:
 * ```tsx
 * const { extract, isExtracting, progress, extracted, error } = useExtractMemoriesWithSSE();
 *
 * <button onClick={() => extract(conversationId)}>
 *   Extract Memories
 * </button>
 *
 * {isExtracting && (
 *   <div>
 *     <Progress value={progress?.current || 0} />
 *     <p>{progress?.message}</p>
 *   </div>
 * )}
 *
 * {extracted !== null && <p>Extracted {extracted} memories!</p>}
 * ```
 */
export function useExtractMemoriesWithSSE() {
  const [sseEndpoint, setSSEEndpoint] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractMemoriesResult | null>(null);
  const [progress, setProgress] = useState<ExtractMemoriesProgress | null>(
    null,
  );

  // SSE hook with polling fallback
  const { data, isLoading, error, strategy } = useSSE<
    ExtractMemoriesResult | ExtractMemoriesProgress
  >(sseEndpoint, {
    pollingInterval: 3000, // Poll every 3s if SSE unavailable
    showErrorToasts: true,
  });

  // Parse SSE events
  // SSE stream sends: progress events, complete event, error event
  // We distinguish by checking for 'extracted' field (complete) vs 'current' field (progress)
  if (data) {
    if ("extracted" in data) {
      // Complete event
      if (result?.extracted !== data.extracted) {
        setResult(data);
        setProgress(null);
        setSSEEndpoint(null); // Stop SSE
      }
    } else if ("current" in data) {
      // Progress event
      setProgress(data);
    }
  }

  const extract = useCallback(async (conversationId: string) => {
    // Reset state
    setResult(null);
    setProgress(null);

    // Start SSE stream
    // Note: SSE endpoint is the same as POST endpoint
    // The endpoint detects SSE via Accept: text/event-stream header
    setSSEEndpoint(`/api/v1/memories/extract?conversationId=${conversationId}`);

    // Trigger the job
    await fetch("/api/v1/memories/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    });
  }, []);

  return {
    extract,
    isExtracting: isLoading || (sseEndpoint !== null && result === null),
    extracted: result?.extracted ?? null,
    progress,
    error,
    strategy, // "sse" | "polling" - useful for debugging
    reset: () => {
      setSSEEndpoint(null);
      setResult(null);
      setProgress(null);
    },
  };
}

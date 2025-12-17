/**
 * useSSE - Server-Sent Events hook with polling fallback
 *
 * Provides real-time data streaming with graceful degradation:
 * 1. Try SSE (EventSource) first for battery-optimal streaming
 * 2. Fall back to HTTP polling if SSE fails or unsupported
 * 3. Automatic reconnection with exponential backoff
 * 4. Proper cleanup on unmount
 *
 * Usage:
 * ```typescript
 * const { data, isLoading, error, strategy } = useSSE<MessageData>(
 *   "/api/v1/messages/stream/123"
 * );
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface UseSSEOptions {
  /** Polling interval if SSE fallback (default: 30s) */
  pollingInterval?: number;
  /** Enable automatic reconnection (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Show toast notifications on errors (default: false) */
  showErrorToasts?: boolean;
}

export interface UseSSEResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  /** Current strategy: "sse" | "polling" | null */
  strategy: "sse" | "polling" | null;
  /** Manual reconnect function */
  reconnect: () => void;
}

/**
 * Hook for SSE with polling fallback
 *
 * @param endpoint - SSE endpoint URL (null to disable)
 * @param options - Configuration options
 * @returns SSE state and controls
 */
export function useSSE<T>(
  endpoint: string | null,
  options: UseSSEOptions = {},
): UseSSEResult<T> {
  const {
    pollingInterval = 30_000,
    autoReconnect = true,
    maxReconnectAttempts = 10,
    showErrorToasts = false,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [strategy, setStrategy] = useState<"sse" | "polling" | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Close EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Polling fallback function
  const startPolling = useCallback(() => {
    if (!endpoint || !isMountedRef.current) return;

    setStrategy("polling");
    setIsLoading(false);

    const poll = async () => {
      try {
        // Convert SSE endpoint to regular HTTP endpoint
        // /api/v1/messages/stream/123 → /api/v1/messages/123
        const httpEndpoint = endpoint.replace("/stream", "");

        const response = await fetch(httpEndpoint);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        if (isMountedRef.current) {
          setData(json.data || json);
          setError(null);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (isMountedRef.current) {
          setError(error);
          if (showErrorToasts) {
            toast.error(`Polling failed: ${error.message}`);
          }
        }
      }
    };

    // Poll immediately, then on interval
    poll();
    pollingIntervalRef.current = setInterval(poll, pollingInterval);
  }, [endpoint, pollingInterval, showErrorToasts]);

  // SSE connection function
  const connectSSE = useCallback(() => {
    if (!endpoint || !isMountedRef.current) return;

    try {
      const eventSource = new EventSource(endpoint);
      eventSourceRef.current = eventSource;
      setStrategy("sse");

      // Handle snapshot event (initial data)
      eventSource.addEventListener("snapshot", (e) => {
        try {
          const parsedData = JSON.parse(e.data);
          if (isMountedRef.current) {
            setData(parsedData);
            setIsLoading(false);
            setError(null);
            reconnectAttemptsRef.current = 0; // Reset on success
          }
        } catch (err) {
          console.error("Failed to parse SSE snapshot:", err);
        }
      });

      // Handle update event (incremental updates)
      eventSource.addEventListener("update", (e) => {
        try {
          const parsedData = JSON.parse(e.data);
          if (isMountedRef.current) {
            setData(parsedData);
            setError(null);
          }
        } catch (err) {
          console.error("Failed to parse SSE update:", err);
        }
      });

      // Handle error event from server
      eventSource.addEventListener("error", (e: Event) => {
        try {
          const messageEvent = e as MessageEvent;
          const errorData = JSON.parse(messageEvent.data);
          if (isMountedRef.current) {
            setError(new Error(errorData.error || "SSE error"));
          }
        } catch (_err) {
          // Generic SSE error (connection lost)
          if (isMountedRef.current && reconnectAttemptsRef.current === 0) {
            console.warn("SSE connection error, falling back to polling");
            cleanup();
            startPolling();
          }
        }
      });

      // Handle connection errors
      eventSource.onerror = () => {
        if (!isMountedRef.current) return;

        // Check if we should fallback to polling
        if (reconnectAttemptsRef.current === 0) {
          console.warn("SSE failed, falling back to HTTP polling");
          if (showErrorToasts) {
            toast.info("Using polling mode (SSE unavailable)");
          }
          cleanup();
          startPolling();
          return;
        }

        // Otherwise try to reconnect with exponential backoff
        if (
          autoReconnect &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          const backoffDelay = Math.min(
            1000 * 2 ** reconnectAttemptsRef.current,
            30_000,
          );
          reconnectAttemptsRef.current += 1;

          console.log(
            `SSE reconnecting in ${backoffDelay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            cleanup();
            connectSSE();
          }, backoffDelay);
        } else {
          // Max attempts reached, fallback to polling
          console.warn(
            "SSE max reconnect attempts reached, falling back to polling",
          );
          if (showErrorToasts) {
            toast.warning("Switched to polling mode");
          }
          cleanup();
          startPolling();
        }
      };

      // Handle open event
      eventSource.onopen = () => {
        if (isMountedRef.current) {
          reconnectAttemptsRef.current = 0;
        }
      };
    } catch (err) {
      // SSE not supported or failed to initialize
      console.error("SSE initialization failed:", err);
      if (isMountedRef.current) {
        startPolling();
      }
    }
  }, [
    endpoint,
    autoReconnect,
    maxReconnectAttempts,
    showErrorToasts,
    cleanup,
    startPolling,
  ]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    cleanup();
    reconnectAttemptsRef.current = 0;
    setError(null);
    setIsLoading(true);
    connectSSE();
  }, [cleanup, connectSSE]);

  // Main effect: Connect when endpoint changes
  useEffect(() => {
    if (!endpoint) {
      cleanup();
      setData(null);
      setIsLoading(false);
      setStrategy(null);
      return;
    }

    connectSSE();

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [endpoint, connectSSE, cleanup]);

  return {
    data,
    isLoading,
    error,
    strategy,
    reconnect,
  };
}

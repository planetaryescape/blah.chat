/**
 * Generic Convex subscription hook for CLI
 *
 * Wraps ConvexClient.onUpdate() in a React hook pattern.
 * Automatically includes apiKey in query args.
 */

import { useEffect, useState } from "react";
import { useConvex } from "../context/ConvexContext.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SubscriptionResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to a Convex query with real-time updates.
 *
 * @param query - The Convex query function reference
 * @param args - Arguments to pass to the query (apiKey is added automatically)
 * @returns { data, error, isLoading }
 *
 * @example
 * const { data: messages } = useConvexSubscription(
 *   api.cliAuth.listMessages,
 *   { conversationId }
 * );
 */
export function useConvexSubscription<T>(
  // Using any for query type to avoid complex FunctionReference generics
  query: unknown,
  args: Record<string, unknown>,
): SubscriptionResult<T> {
  const { client, apiKey } = useConvex();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  // Serialize args for dependency tracking
  const argsKey = JSON.stringify(args);

  useEffect(() => {
    // Reset state on new subscription
    setError(null);

    // Subscribe with apiKey injected (cast needed for Convex types)
    const unsubscribe = client.onUpdate(
      query as Parameters<typeof client.onUpdate>[0],
      { ...args, apiKey },
      (result: T) => {
        setData(result);
        setError(null);
      },
      (err: Error) => {
        setError(err);
      },
    );

    // Cleanup subscription on unmount or args change
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, apiKey, query, argsKey]);

  return {
    data,
    error,
    isLoading: data === undefined && error === null,
  };
}

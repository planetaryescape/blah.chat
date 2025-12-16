import { QueryClient } from "@tanstack/react-query";

const isServer = typeof window === "undefined";
let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Phase 7: Aggressive caching - Convex real-time updates handle freshness
        staleTime: 5 * 60 * 1000, // 5min stale (trust Convex subscriptions for updates)
        gcTime: 30 * 60 * 1000, // 30min garbage collection (keep in memory longer)
        refetchOnWindowFocus: false, // Don't refetch on tab switch (reduces 80% of unnecessary calls)
        refetchOnReconnect: true, // Refetch when network reconnects (catch up after offline)
        refetchOnMount: false, // Use cache on mount, rely on staleTime
        retry: (failureCount, error: any) => {
          if (error?.status >= 400 && error?.status < 500) return false; // No retry on 4xx
          return failureCount < 2; // Retry 5xx/network twice
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      },
      mutations: {
        retry: false, // Never retry mutations (prevent duplicates)
        gcTime: 0,
      },
    },
  });
}

export function getQueryClient() {
  if (isServer) return makeQueryClient(); // Server: always new
  if (!browserQueryClient) browserQueryClient = makeQueryClient(); // Browser: singleton
  return browserQueryClient;
}

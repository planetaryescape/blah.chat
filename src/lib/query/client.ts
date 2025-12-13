import { QueryClient } from "@tanstack/react-query";

const isServer = typeof window === "undefined";
let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1min (Convex handles real-time)
        gcTime: 5 * 60 * 1000, // 5min garbage collection
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

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { useQuery as useConvexQuery } from "convex/react";
import { useApiClient } from "@/lib/api/client";
import { shouldUseConvex } from "@/lib/utils/platform";

/**
 * Hybrid query hook for user preferences
 * - Web: Convex WebSocket subscription (real-time)
 * - Mobile: REST API with React Query (HTTP polling)
 */
export function usePreferences() {
  const useConvexMode = shouldUseConvex();
  const apiClient = useApiClient();

  // Convex WebSocket subscription (web desktop)
  const convexData = useConvexQuery(
    api.users.getAllUserPreferences,
    useConvexMode ? {} : "skip",
  );

  // REST API query (mobile)
  const restQuery = useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiClient.get("/preferences"),
    enabled: !useConvexMode,
    staleTime: 60 * 60 * 1000, // 1h (matches CachePresets.STATIC)
  });

  // Return unified interface
  if (useConvexMode) {
    return {
      data: convexData,
      isLoading: convexData === undefined,
      error: null,
      refetch: () => Promise.resolve(),
    };
  }

  return {
    data: restQuery.data,
    isLoading: restQuery.isLoading,
    error: restQuery.error,
    refetch: restQuery.refetch,
  };
}

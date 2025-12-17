import { useQuery } from "@tanstack/react-query";
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useApiClient } from "@/lib/api/client";
import { shouldUseConvex } from "@/lib/utils/platform";

export interface UseConversationsOptions {
  page?: number;
  pageSize?: number;
  archived?: boolean;
}

/**
 * Hybrid query hook for conversations
 * - Web: Convex WebSocket subscription (real-time)
 * - Mobile: REST API with React Query (HTTP polling)
 */
export function useConversations(options: UseConversationsOptions = {}) {
  const { page = 1, pageSize = 20, archived = false } = options;
  const useConvexMode = shouldUseConvex();
  const apiClient = useApiClient();

  // Convex WebSocket subscription (web desktop)
  // Note: api.conversations.list doesn't support archived param (hardcoded to false)
  // Archived conversations need different query or REST API
  const convexData = useConvexQuery(
    api.conversations.list,
    useConvexMode && !archived ? {} : "skip",
  );

  // REST API query (mobile)
  const restQuery = useQuery({
    queryKey: ["conversations", { page, pageSize, archived }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        archived: String(archived),
      });
      return apiClient.get(`/conversations?${params}`);
    },
    enabled: !useConvexMode,
    staleTime: 30_000, // 30s (matches CachePresets.LIST)
  });

  // Return unified interface
  if (useConvexMode) {
    return {
      data: convexData
        ? {
            items: convexData,
            pagination: {
              page: 1,
              pageSize: convexData.length,
              total: convexData.length,
              hasNext: false,
            },
          }
        : undefined,
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

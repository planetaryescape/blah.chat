import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { usePaginatedQuery } from "convex/react";
import { useApiClient } from "@/lib/api/client";
import { shouldUseConvex } from "@/lib/utils/platform";

export interface UseMessagesOptions {
  conversationId: Id<"conversations">;
  page?: number;
  pageSize?: number;
}

/**
 * Hybrid query hook for messages
 * - Web: Convex WebSocket subscription with pagination (real-time)
 * - Mobile: REST API with React Query (HTTP polling)
 */
export function useMessages(options: UseMessagesOptions) {
  const { conversationId, page = 1, pageSize = 50 } = options;
  const useConvexMode = shouldUseConvex();
  const apiClient = useApiClient();

  // Convex WebSocket subscription (web desktop)
  const convexData = usePaginatedQuery(
    api.messages.listPaginated,
    useConvexMode ? { conversationId } : "skip",
    { initialNumItems: pageSize },
  );

  // REST API query (mobile)
  const restQuery = useQuery({
    queryKey: ["messages", conversationId, { page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      return apiClient.get(
        `/conversations/${conversationId}/messages?${params}`,
      );
    },
    enabled: !useConvexMode,
    staleTime: 30_000, // 30s (matches CachePresets.LIST)
  });

  // Return unified interface
  if (useConvexMode) {
    return {
      data: convexData.results
        ? {
            items: convexData.results,
            pagination: {
              page: 1,
              pageSize: convexData.results.length,
              total: convexData.results.length,
              hasNext: convexData.status === "CanLoadMore",
            },
          }
        : undefined,
      isLoading: convexData.results === undefined,
      error: null,
      loadMore: (numItems: number) => convexData.loadMore(numItems),
      refetch: () => Promise.resolve(),
    };
  }

  return {
    data: restQuery.data,
    isLoading: restQuery.isLoading,
    error: restQuery.error,
    loadMore: () => {}, // Not applicable for REST mode
    refetch: restQuery.refetch,
  };
}

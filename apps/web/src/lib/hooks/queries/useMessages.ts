import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { usePaginatedQuery } from "convex/react";
import { useSDKClient } from "@/lib/api/sdkClient";
import { fromConvexMessages, fromHttpMessages } from "@/lib/transport/chat";
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
  const sdk = useSDKClient();

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
      void params;
      return sdk.listMessages(conversationId);
    },
    enabled: !useConvexMode,
    staleTime: 30_000, // 30s (matches CachePresets.LIST)
  });

  // Return unified interface
  if (useConvexMode) {
    return {
      data: convexData.results
        ? fromConvexMessages(
            convexData.results,
            convexData.status === "CanLoadMore",
          )
        : undefined,
      isLoading: convexData.results === undefined,
      error: null,
      loadMore: (numItems: number) => convexData.loadMore(numItems),
      refetch: () => Promise.resolve(),
    };
  }

  return {
    data: restQuery.data ? fromHttpMessages(restQuery.data) : undefined,
    isLoading: restQuery.isLoading,
    error: restQuery.error,
    loadMore: () => {}, // Not applicable for REST mode
    refetch: restQuery.refetch,
  };
}

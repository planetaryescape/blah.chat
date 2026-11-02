import { useQuery } from "@tanstack/react-query";
import { useQuery as useConvexQuery } from "convex/react";
import { anyApi } from "convex/server";
import { useSDKClient } from "@/lib/api/sdkClient";
import {
  fromConvexConversations,
  fromHttpConversations,
} from "@/lib/transport/chat";
import { shouldUseConvex } from "@/lib/utils/platform";

const api = anyApi as any;

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
  const sdk = useSDKClient();

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
        limit: String(pageSize),
        archived: String(archived),
      });
      const response = await sdk.listConversations({
        limit: Number.parseInt(params.get("limit") || "20", 10),
        archived,
      });
      return response;
    },
    enabled: !useConvexMode,
    staleTime: 30_000, // 30s (matches CachePresets.LIST)
  });

  // Return unified interface
  if (useConvexMode) {
    return {
      data: convexData ? fromConvexConversations(convexData) : undefined,
      isLoading: convexData === undefined,
      error: null,
      refetch: () => Promise.resolve(),
    };
  }

  return {
    data: restQuery.data ? fromHttpConversations(restQuery.data) : undefined,
    isLoading: restQuery.isLoading,
    error: restQuery.error,
    refetch: restQuery.refetch,
  };
}

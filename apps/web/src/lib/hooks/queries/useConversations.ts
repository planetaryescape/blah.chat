import { useQuery } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";
import { fromHttpConversations } from "@/lib/transport/chat";

export interface UseConversationsOptions {
  page?: number;
  pageSize?: number;
  archived?: boolean;
}

export function useConversations(options: UseConversationsOptions = {}) {
  const { page = 1, pageSize = 20, archived = false } = options;
  const sdk = useSDKClient();

  const restQuery = useQuery({
    queryKey: ["conversations", { page, pageSize, archived }],
    queryFn: async () =>
      sdk.listConversations({
        limit: pageSize,
        archived,
      }),
    staleTime: 30_000,
  });

  return {
    data: restQuery.data ? fromHttpConversations(restQuery.data) : undefined,
    isLoading: restQuery.isLoading,
    error: restQuery.error,
    refetch: restQuery.refetch,
  };
}

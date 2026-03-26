import { useQuery } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";
import { fromHttpMessages } from "@/lib/transport/chat";

export interface UseMessagesOptions {
  conversationId: string;
  page?: number;
  pageSize?: number;
}

export function useMessages(options: UseMessagesOptions) {
  const { conversationId, page = 1, pageSize = 50 } = options;
  const sdk = useSDKClient();

  const restQuery = useQuery({
    queryKey: ["messages", conversationId, { page, pageSize }],
    queryFn: async () => sdk.listMessages(conversationId),
    staleTime: 30_000,
  });

  return {
    data: restQuery.data ? fromHttpMessages(restQuery.data) : undefined,
    isLoading: restQuery.isLoading,
    error: restQuery.error,
    loadMore: () => {},
    refetch: restQuery.refetch,
  };
}

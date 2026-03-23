import { useQuery } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";

export function useSearchConversations(searchQuery = "", limit = 50) {
  const sdk = useSDKClient();
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const query = useQuery({
    queryKey: ["search-conversations", { limit }],
    queryFn: async () => {
      const response = await sdk.listConversations({ limit });
      return response.items;
    },
    staleTime: 30_000,
  });

  return {
    conversations: query.data?.filter((conversation) => {
      if (!normalizedQuery) {
        return true;
      }

      return (conversation.title ?? "").toLowerCase().includes(normalizedQuery);
    }),
    isLoading: query.isLoading,
    error: query.error,
  };
}

import type { Memory } from "@blah-chat/api-client";
import { useQuery } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";

export interface UseMemoriesOptions {
  category?: string | null;
  sortBy?: "date" | "importance" | "confidence" | null;
  searchQuery?: string | null;
  limit?: number;
}

export function useMemories(options: UseMemoriesOptions = {}) {
  const sdk = useSDKClient();

  return useQuery<Memory[]>({
    queryKey: ["memories", options],
    queryFn: () =>
      sdk.listMemories({
        category: options.category ?? undefined,
        sortBy: options.sortBy ?? undefined,
        searchQuery: options.searchQuery?.trim() || undefined,
        limit: options.limit,
      }),
    staleTime: 30_000,
  });
}

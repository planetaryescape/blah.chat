import { useEffect, useState } from "react";
import { useSDKClient } from "@/lib/api/sdkClient";

export interface SearchFilters {
  conversation?: string | null;
  from?: number | null;
  to?: number | null;
  type?: "user" | "assistant" | null;
}

export function useSearchResults(
  query: string,
  filters: SearchFilters,
  page: number,
) {
  const sdk = useSDKClient();
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Execute search when query or filters change
  useEffect(() => {
    const trimmedQuery = query?.trim() ?? "";

    if (!trimmedQuery) {
      setResults([]);
      setIsSearching(false);
      setHasMore(false);
      return;
    }

    const executeSearch = async () => {
      setIsSearching(true);
      try {
        const limit = page * 20;
        const searchResults = await sdk.searchMessages({
          query: trimmedQuery,
          limit,
          conversationId: filters.conversation ?? undefined,
          dateFrom: filters.from ? Number(filters.from) : undefined,
          dateTo: filters.to ? Number(filters.to) : undefined,
          messageType: filters.type ?? undefined,
        });

        setResults(searchResults);
        setHasMore(searchResults.length === limit);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
        setHasMore(false);
      } finally {
        setIsSearching(false);
      }
    };

    executeSearch();
  }, [
    query,
    filters.conversation,
    filters.from,
    filters.to,
    filters.type,
    page,
    sdk,
  ]);

  return {
    results,
    isSearching,
    hasMore,
  };
}

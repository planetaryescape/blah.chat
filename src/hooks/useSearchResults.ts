import { useAction } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const hybridSearch = useAction(api.search.hybridSearch);

  // Execute search when query or filters change
  useEffect(() => {
    const trimmedQuery = query.trim();

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
        const searchResults = await hybridSearch({
          query: trimmedQuery,
          limit,
          conversationId: filters.conversation as
            | Id<"conversations">
            | undefined,
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
    hybridSearch,
  ]);

  return {
    results,
    isSearching,
    hasMore,
  };
}

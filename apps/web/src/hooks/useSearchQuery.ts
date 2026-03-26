import { useEffect, useState } from "react";
import { useSDKClient } from "@/lib/api/sdkClient";

interface UseSearchQueryOptions {
  conversationId?: string;
  dateFrom?: number;
  dateTo?: number;
  messageType?: "user" | "assistant";
  limit?: number;
  debounceMs?: number;
}

export function useSearchQuery(options: UseSearchQueryOptions = {}) {
  const {
    conversationId,
    dateFrom,
    dateTo,
    messageType,
    limit = 20,
    debounceMs = 350,
  } = options;

  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const sdk = useSDKClient();

  // Debounce the input value
  useEffect(() => {
    const trimmedInput = inputValue.trim();

    // If empty, clear immediately
    if (!trimmedInput) {
      setDebouncedQuery("");
      setResults([]);
      setHasMore(false);
      return;
    }

    // Debounce non-empty queries
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmedInput);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, debounceMs]);

  // Execute search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const executeSearch = async () => {
      setIsSearching(true);
      try {
        const searchResults = await sdk.searchMessages({
          query: debouncedQuery,
          limit,
          conversationId,
          dateFrom,
          dateTo,
          messageType,
        });

        setResults(searchResults);
        setHasMore(searchResults.length === limit);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    executeSearch();
  }, [
    debouncedQuery,
    limit,
    conversationId,
    dateFrom,
    dateTo,
    messageType,
    sdk,
  ]);

  // Indicator for debouncing state
  const isDebouncing = inputValue.trim() !== debouncedQuery;

  return {
    inputValue,
    setInputValue,
    debouncedQuery,
    results,
    isSearching: isSearching || isDebouncing,
    hasMore,
  };
}

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

type Conversation = Doc<"conversations">;

export function useConversationSearch(
  projectId?: string | null,
  debounceMs = 350,
) {
  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const hybridSearch = useAction(api.conversations.hybridSearch.hybridSearch);
  const [results, setResults] = useState<Conversation[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!query.trim()) {
        setResults(null);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      debounceRef.current = setTimeout(async () => {
        try {
          const searchResults = await hybridSearch({
            query: query.trim(),
            limit: 50,
            projectId:
              projectId === "none"
                ? "none"
                : projectId
                  ? (projectId as Id<"projects">)
                  : undefined,
          });
          setResults(searchResults);
        } catch (error) {
          console.error("Search failed:", error);
          setResults(null);
        } finally {
          setIsSearching(false);
        }
      }, debounceMs);
    },
    [hybridSearch, debounceMs, projectId],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { results, isSearching, search };
}

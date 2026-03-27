import { useAuth } from "@clerk/clerk-expo";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Doc } from "@/lib/convex";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

type Conversation = Doc<"conversations">;

export function useConversationSearch(
  projectId?: string | null,
  debounceMs = 350,
) {
  const { getToken } = useAuth();
  const [results, setResults] = useState<Conversation[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (query: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!query.trim()) {
        setResults(null);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const client = createMobileSdkClient(() => getToken());
          const response = await client.listConversations({
            limit: 200,
            archived: false,
            projectId: projectId === "none" ? "none" : (projectId ?? undefined),
          });
          const normalizedQuery = query.trim().toLowerCase();
          setResults(
            (response.items as Conversation[]).filter((conversation) =>
              [conversation.title ?? "", conversation.model ?? ""]
                .join(" ")
                .toLowerCase()
                .includes(normalizedQuery),
            ),
          );
        } catch {
          setResults(null);
        } finally {
          setIsSearching(false);
        }
      }, debounceMs);
    },
    [debounceMs, getToken, projectId],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { results, isSearching, search };
}

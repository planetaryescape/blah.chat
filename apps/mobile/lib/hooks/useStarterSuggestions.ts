import type { StarterSuggestion } from "@blah-chat/api-client";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { queryClient } from "@/lib/cache/queryClient";
import {
  EMERGENCY_SUGGESTED_PROMPTS,
  type SuggestedPrompt,
} from "@/lib/prompts/suggestions";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

const VISIBLE_COUNT = 3;

type StarterSuggestionsResponse = {
  suggestions: SuggestedPrompt[];
  needsRefresh: boolean;
  generatedAt: number;
  source: "cache" | "fallback";
};

let mountCounter = 0;

function toSuggestedPrompt(
  suggestion: StarterSuggestion | SuggestedPrompt,
): SuggestedPrompt {
  return {
    id: suggestion.id,
    text: suggestion.text,
    icon: suggestion.icon,
  };
}

export function useStarterSuggestions() {
  const { getToken } = useAuth();
  const refreshKeyRef = useRef<string | null>(null);
  const cycleRef = useRef<number | null>(null);

  if (cycleRef.current === null) {
    cycleRef.current = mountCounter++;
  }

  const query = useQuery({
    queryKey: ["mobile", "starter-suggestions"],
    staleTime: 60_000,
    queryFn: async (): Promise<StarterSuggestionsResponse> => {
      const client = createMobileSdkClient(() => getToken());

      try {
        const response = await client.getStarterSuggestions();
        return {
          ...response,
          suggestions: response.suggestions.map(toSuggestedPrompt),
        };
      } catch {
        return {
          suggestions: EMERGENCY_SUGGESTED_PROMPTS,
          needsRefresh: false,
          generatedAt: Date.now(),
          source: "fallback",
        };
      }
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async (force: boolean) => {
      const client = createMobileSdkClient(() => getToken());
      return client.refreshStarterSuggestions({ force });
    },
    onSuccess: (data) => {
      queryClient.setQueryData<StarterSuggestionsResponse>(
        ["mobile", "starter-suggestions"],
        {
          ...data,
          suggestions: data.suggestions.map(toSuggestedPrompt),
        },
      );
    },
  });

  useEffect(() => {
    const data = query.data;
    if (!data?.needsRefresh) {
      refreshKeyRef.current = null;
      return;
    }

    const refreshKey = `${data.generatedAt}:${data.source}`;
    if (refreshKeyRef.current === refreshKey) {
      return;
    }

    refreshKeyRef.current = refreshKey;
    refreshMutation.mutate(false);
  }, [query.data, refreshMutation]);

  const pool =
    query.data?.suggestions && query.data.suggestions.length > 0
      ? query.data.suggestions
      : EMERGENCY_SUGGESTED_PROMPTS;

  const visibleSuggestions = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(pool.length / VISIBLE_COUNT));
    const page = (cycleRef.current ?? 0) % totalPages;
    const start = page * VISIBLE_COUNT;
    return pool.slice(start, start + VISIBLE_COUNT);
  }, [pool]);

  return {
    suggestions: pool,
    visibleSuggestions,
    generatedAt: query.data?.generatedAt,
    source: query.data?.source ?? "fallback",
    isLoading: query.data === undefined,
  };
}

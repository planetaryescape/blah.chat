import { useAction, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/lib/convex";
import {
  EMERGENCY_SUGGESTED_PROMPTS,
  type SuggestedPrompt,
} from "@/lib/prompts/suggestions";

type StarterSuggestionsResponse = {
  suggestions: SuggestedPrompt[];
  needsRefresh: boolean;
  generatedAt: number;
  source: "cache" | "fallback";
};

export function useStarterSuggestions() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const data = useQuery(
    (api as any).chatSuggestions.getForCurrentUser,
  ) as StarterSuggestionsResponse | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const refresh = useAction((api as any).chatSuggestions.refreshForCurrentUser);
  const refreshKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!data?.needsRefresh) {
      refreshKeyRef.current = null;
      return;
    }

    const refreshKey = `${data.generatedAt}:${data.source}`;
    if (refreshKeyRef.current === refreshKey) return;

    refreshKeyRef.current = refreshKey;
    refresh({ force: false }).catch(() => {});
  }, [data?.generatedAt, data?.needsRefresh, data?.source, refresh]);

  return {
    suggestions:
      data?.suggestions && data.suggestions.length > 0
        ? data.suggestions
        : EMERGENCY_SUGGESTED_PROMPTS,
    generatedAt: data?.generatedAt,
    source: data?.source ?? "fallback",
    isLoading: data === undefined,
  };
}

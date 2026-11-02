import { useAction, useQuery } from "convex/react";
import { useEffect, useMemo, useRef } from "react";
import { api } from "@/lib/convex";
import {
  EMERGENCY_SUGGESTED_PROMPTS,
  type SuggestedPrompt,
} from "@/lib/prompts/suggestions";

const VISIBLE_COUNT = 3;

type StarterSuggestionsResponse = {
  suggestions: SuggestedPrompt[];
  needsRefresh: boolean;
  generatedAt: number;
  source: "cache" | "fallback";
};

let mountCounter = 0;

export function useStarterSuggestions() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const data = useQuery((api as any).chatSuggestions.getForCurrentUser) as
    | StarterSuggestionsResponse
    | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const refresh = useAction((api as any).chatSuggestions.refreshForCurrentUser);
  const refreshKeyRef = useRef<string | null>(null);

  // Stable cycle index per hook mount
  const cycleRef = useRef<number | null>(null);
  if (cycleRef.current === null) {
    cycleRef.current = mountCounter++;
  }

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

  const pool =
    data?.suggestions && data.suggestions.length > 0
      ? data.suggestions
      : EMERGENCY_SUGGESTED_PROMPTS;

  const visibleSuggestions = useMemo(() => {
    const totalPages = Math.ceil(pool.length / VISIBLE_COUNT);
    const page = (cycleRef.current ?? 0) % totalPages;
    const start = page * VISIBLE_COUNT;
    return pool.slice(start, start + VISIBLE_COUNT);
  }, [pool]);

  return {
    suggestions: pool,
    visibleSuggestions,
    generatedAt: data?.generatedAt,
    source: data?.source ?? "fallback",
    isLoading: data === undefined,
  };
}

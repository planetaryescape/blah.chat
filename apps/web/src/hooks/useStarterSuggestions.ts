import { api } from "@blah-chat/backend/convex/_generated/api";
import type {
  StarterSuggestion,
  StarterSuggestionsResponse,
} from "@blah-chat/shared";
import { useAction, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

const FALLBACK_SUGGESTIONS: StarterSuggestion[] = [
  {
    id: "starter-plan-next-week",
    text: "Plan my week around the priorities I should focus on first",
    icon: "sparkles",
  },
  {
    id: "starter-clarify-draft",
    text: "Rewrite this draft so it is clear, concise, and confident",
    icon: "penLine",
  },
  {
    id: "starter-debug-issue",
    text: "Help me debug this issue step by step and propose the safest fix",
    icon: "brain",
  },
  {
    id: "starter-compare-options",
    text: "Compare these options and recommend one with clear tradeoffs",
    icon: "zap",
  },
  {
    id: "starter-follow-up",
    text: "Draft a short follow-up message for this conversation",
    icon: "sparkles",
  },
];

export function useStarterSuggestions() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const data = useQuery((api as any).chatSuggestions.getForCurrentUser) as
    | StarterSuggestionsResponse
    | undefined;

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
        : FALLBACK_SUGGESTIONS,
    generatedAt: data?.generatedAt,
    source: data?.source ?? "fallback",
    isLoading: data === undefined,
  };
}

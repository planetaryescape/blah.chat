import { api } from "@blah-chat/backend/convex/_generated/api";
import {
  type StarterSuggestion,
  type StarterSuggestionsResponse,
  VISIBLE_SUGGESTION_COUNT,
} from "@blah-chat/shared";
import { useAction, useQuery } from "convex/react";
import { useEffect, useMemo, useRef } from "react";

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
  {
    id: "starter-brainstorm",
    text: "Brainstorm creative ideas for this project and pick the strongest three",
    icon: "brain",
  },
];

const SESSION_COUNTER_KEY = "blah-suggestions-cycle";

function getSessionCycle(): number {
  if (typeof window === "undefined") return 0;
  const stored = sessionStorage.getItem(SESSION_COUNTER_KEY);
  const next = stored ? Number.parseInt(stored, 10) + 1 : 0;
  sessionStorage.setItem(SESSION_COUNTER_KEY, String(next));
  return next;
}

export function useStarterSuggestions() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const data = useQuery((api as any).chatSuggestions.getForCurrentUser) as
    | StarterSuggestionsResponse
    | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const refresh = useAction((api as any).chatSuggestions.refreshForCurrentUser);
  const refreshKeyRef = useRef<string | null>(null);

  // Stable cycle index per hook mount — incremented once in sessionStorage
  const cycleRef = useRef<number | null>(null);
  if (cycleRef.current === null) {
    cycleRef.current = getSessionCycle();
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
      : FALLBACK_SUGGESTIONS;

  const visibleSuggestions = useMemo(() => {
    const totalPages = Math.ceil(pool.length / VISIBLE_SUGGESTION_COUNT);
    const page = (cycleRef.current ?? 0) % totalPages;
    const start = page * VISIBLE_SUGGESTION_COUNT;
    return pool.slice(start, start + VISIBLE_SUGGESTION_COUNT);
  }, [pool]);

  return {
    suggestions: pool,
    visibleSuggestions,
    generatedAt: data?.generatedAt,
    source: data?.source ?? "fallback",
    isLoading: data === undefined,
  };
}

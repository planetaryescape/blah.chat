import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";

export interface SearchFilters {
  conversationId?: Id<"conversations">;
  dateFrom?: number;
  dateTo?: number;
  messageType?: "user" | "assistant";
}

export function useSearchFilters() {
  const searchParams = useSearchParams();

  const filters = useMemo<SearchFilters>(() => {
    const conversationParam = searchParams.get("conversation");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const typeParam = searchParams.get("type");

    return {
      conversationId: conversationParam
        ? (conversationParam as Id<"conversations">)
        : undefined,
      dateFrom: fromParam ? Number.parseInt(fromParam, 10) : undefined,
      dateTo: toParam ? Number.parseInt(toParam, 10) : undefined,
      messageType:
        typeParam === "user" || typeParam === "assistant"
          ? typeParam
          : undefined,
    };
  }, [searchParams]);

  const setFilter = (key: keyof SearchFilters, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Update URL without full page reload
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, "", newUrl);
  };

  const clearFilters = () => {
    const newUrl = window.location.pathname;
    window.history.pushState({}, "", newUrl);
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined,
  );

  return {
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
  };
}

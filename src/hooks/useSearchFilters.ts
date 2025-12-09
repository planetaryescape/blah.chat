import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useMemo } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export interface SearchFilters {
  conversationId?: Id<"conversations">;
  dateFrom?: number;
  dateTo?: number;
  messageType?: "user" | "assistant";
}

export function useSearchFilters() {
  const [params, setParams] = useQueryStates({
    conversation: parseAsString,
    from: parseAsInteger,
    to: parseAsInteger,
    type: parseAsStringLiteral(["user", "assistant"] as const),
  });

  const filters = useMemo<SearchFilters>(
    () => ({
      conversationId: params.conversation
        ? (params.conversation as Id<"conversations">)
        : undefined,
      dateFrom: params.from ?? undefined,
      dateTo: params.to ?? undefined,
      messageType: params.type ?? undefined,
    }),
    [params],
  );

  const setFilter = (key: keyof SearchFilters, value: string | null) => {
    // Map filter keys to URL param keys
    const paramKey = {
      conversationId: "conversation",
      dateFrom: "from",
      dateTo: "to",
      messageType: "type",
    }[key] as "conversation" | "from" | "to" | "type";

    setParams({ [paramKey]: value });
  };

  const clearFilters = () => {
    setParams({ conversation: null, from: null, to: null, type: null });
  };

  const hasActiveFilters = Object.values(params).some(
    (value) => value !== null,
  );

  return {
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
  };
}

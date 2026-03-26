"use client";

/**
 * @deprecated No longer used. Messages now come from REST SDK via useMessages hook.
 * Kept as empty export to avoid broken imports during transition.
 */
export function useStableMessages(_opts: {
  conversationId?: string;
  initialNumItems?: number;
}) {
  return {
    results: [] as any[],
    status: "Exhausted" as const,
    loadMore: () => {},
    isLoadingMore: false,
  };
}

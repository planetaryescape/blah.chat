"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { usePaginatedQuery } from "convex-helpers/react/cache";
import { useMemo, useRef } from "react";

interface UseStableMessagesOptions {
  conversationId: Id<"conversations"> | undefined;
  initialNumItems?: number;
}

/**
 * Wrapper around usePaginatedQuery that keeps previous data during refetches.
 *
 * Problem: Convex's usePaginatedQuery returns `undefined` during reactive updates,
 * causing UI flash and scroll reset.
 *
 * Solution: Keep the last valid results and return them when current results are undefined.
 * This provides a "keepPreviousData" behavior similar to TanStack Query.
 */
export function useStableMessages({
  conversationId,
  initialNumItems = 50,
}: UseStableMessagesOptions) {
  const paginatedQuery = usePaginatedQuery(
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    api.messages.listPaginated,
    conversationId ? { conversationId } : "skip",
    { initialNumItems },
  );
  const { results, status, loadMore } = paginatedQuery;

  // Track conversation to reset cache on switch
  const lastConversationIdRef = useRef<Id<"conversations"> | undefined>(
    undefined,
  );
  const lastValidResultsRef = useRef<Doc<"messages">[]>([]);

  // Reset cache when conversation changes
  if (conversationId !== lastConversationIdRef.current) {
    lastConversationIdRef.current = conversationId;
    lastValidResultsRef.current = [];
  }

  // Update cache with ANY defined results (including empty arrays)
  // This is critical: caching empty arrays as valid state prevents a UI flash
  // when switching to a new conversation that currently has no messages.
  if (results !== undefined) {
    lastValidResultsRef.current = results;
  }

  // Return stable results: current OR cached
  const stableResults = useMemo(() => {
    if (results !== undefined) {
      return results;
    }
    return lastValidResultsRef.current;
  }, [results]);

  // isFirstLoad = loading AND no cached data
  // This ensures we never flash the skeleton after initial load
  const isFirstLoad =
    results === undefined && lastValidResultsRef.current.length === 0;
  const isRefetching =
    results === undefined && lastValidResultsRef.current.length > 0;

  return {
    results: stableResults,
    status,
    loadMore,
    isFirstLoad,
    isRefetching,
  };
}

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { cache } from "@/lib/cache";

/**
 * Hook to detect and find reusable empty conversations
 *
 * Behavior:
 * - Checks ALL conversations (pinned and unpinned)
 * - Uses real-time Convex query (not cached messageCount)
 * - No age limit - always reuses most recent empty
 * - Returns null if no empty conversations found
 */
export function useEmptyConversationReuse() {
  const conversations = useLiveQuery(
    () => cache.conversations.toArray(),
    [],
    [],
  );

  const findEmptyConversation = useCallback((): any | null => {
    if (!conversations?.length) return null;

    // Sort by lastMessageAt (most recent first)
    const sorted = [...conversations].sort(
      (a, b) => b.lastMessageAt - a.lastMessageAt,
    );

    // Find first empty conversation (messageCount === 0)
    return sorted.find((c) => c.messageCount === 0) ?? null;
  }, [conversations]);

  return {
    findEmptyConversation,
    isLoading: conversations === undefined,
  };
}

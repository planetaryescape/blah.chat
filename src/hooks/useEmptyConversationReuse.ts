"use client";

import { useQuery } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

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
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const conversations = useQuery(api.conversations.list, {});

  const findEmptyConversation = useCallback((): Doc<"conversations"> | null => {
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

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";

interface UseConversationNavigationOptions {
  conversationId: Id<"conversations">;
  filteredConversations: Doc<"conversations">[] | undefined;
}

interface UseConversationNavigationReturn {
  currentIndex: number;
  isFirst: boolean;
  isLast: boolean;
  navigateToPrevious: () => void;
  navigateToNext: () => void;
}

/**
 * Handles navigation between conversations using arrow keys or buttons.
 * Sorts conversations by creation time (newest first) and provides
 * previous/next navigation.
 */
export function useConversationNavigation({
  conversationId,
  filteredConversations,
}: UseConversationNavigationOptions): UseConversationNavigationReturn {
  const router = useRouter();

  const { currentIndex, isFirst, isLast, sortedConversations } = useMemo(() => {
    if (!filteredConversations?.length || !conversationId) {
      return {
        currentIndex: -1,
        isFirst: true,
        isLast: true,
        sortedConversations: [],
      };
    }

    const sorted = [...filteredConversations].sort(
      (a, b) => b._creationTime - a._creationTime,
    );
    const idx = sorted.findIndex((c) => c._id === conversationId);

    return {
      currentIndex: idx,
      isFirst: idx <= 0,
      isLast: idx >= sorted.length - 1,
      sortedConversations: sorted,
    };
  }, [filteredConversations, conversationId]);

  const navigateToPrevious = useCallback(() => {
    if (isFirst || sortedConversations.length === 0) return;

    const prevIdx = Math.max(currentIndex - 1, 0);
    router.push(`/chat/${sortedConversations[prevIdx]._id}`);
  }, [isFirst, sortedConversations, currentIndex, router]);

  const navigateToNext = useCallback(() => {
    if (isLast || sortedConversations.length === 0) return;

    const nextIdx = Math.min(currentIndex + 1, sortedConversations.length - 1);
    router.push(`/chat/${sortedConversations[nextIdx]._id}`);
  }, [isLast, sortedConversations, currentIndex, router]);

  return {
    currentIndex,
    isFirst,
    isLast,
    navigateToPrevious,
    navigateToNext,
  };
}

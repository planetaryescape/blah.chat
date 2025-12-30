"use client";

import { useEffect, useRef } from "react";
import type { GroupedItem } from "@/hooks/useMessageGrouping";

interface Message {
  _id: string;
  role: string;
}

interface UseConversationScrollOptions {
  conversationId?: string;
  messageCount: number;
  highlightMessageId?: string;
  messages: Message[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  virtualizer: any;
  grouped: GroupedItem[];
  scrollContainer?: React.RefObject<HTMLDivElement | null>;
  onScrollReady?: (ready: boolean) => void;
}

/** Scrolls to bottom on conversation switch, and to new user message on send */
export function useConversationScroll({
  conversationId,
  messageCount,
  highlightMessageId,
  messages,
  virtualizer,
  grouped,
  scrollContainer,
  onScrollReady,
}: UseConversationScrollOptions): void {
  const lastScrolledConversationRef = useRef<string | undefined>(undefined);
  const prevMessageCountRef = useRef(messageCount);

  // Refs to avoid stale closures - effect deps stay minimal
  const virtualizerRef = useRef(virtualizer);
  const groupedRef = useRef(grouped);
  virtualizerRef.current = virtualizer;
  groupedRef.current = grouped;

  // Scroll to bottom on conversation switch
  // Only depend on conversationId to minimize re-runs
  useEffect(() => {
    // Skip if highlighting a specific message (useHighlightScroll handles it)
    // or no conversation loaded yet
    if (highlightMessageId || !conversationId) return;

    // Only scroll if conversation actually changed
    const isConversationChanged =
      lastScrolledConversationRef.current !== conversationId;

    if (!isConversationChanged) {
      onScrollReady?.(true); // Already scrolled, show content
      return;
    }

    // If no messages yet (empty conversation), mark as ready immediately
    // Check both messageCount and groupedRef for accuracy
    if (messageCount === 0 || groupedRef.current.length === 0) {
      lastScrolledConversationRef.current = conversationId;
      onScrollReady?.(true);
      return;
    }

    // Hide content while scrolling to new conversation
    onScrollReady?.(false);

    // Use virtualizer's scrollToIndex for reliable scrolling with virtual lists
    let attempts = 0;
    const maxAttempts = 15;
    const minAttempts = 5; // Force minimum attempts to handle measurement lag
    let isScrolling = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined; // Explicitly allow undefined for cleanup before first timeout

    const scrollToEnd = () => {
      if (!isScrolling) return;

      // Clear any pending timeout before scheduling a new one
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      const container = scrollContainer?.current;
      if (!container) {
        timeoutId = setTimeout(scrollToEnd, 100);
        return;
      }

      const currentLastIndex = groupedRef.current.length - 1;
      if (currentLastIndex < 0) {
        timeoutId = setTimeout(scrollToEnd, 100);
        return;
      }

      // Use virtualizer's totalSize for accurate measurement (not DOM scrollHeight)
      const virtualizerTotalSize = virtualizerRef.current?.getTotalSize() || 0;
      const containerHeight = container.clientHeight;
      const scrollTop = container.scrollTop;

      // Calculate distance using virtualizer's measured total size
      const distanceFromBottom = Math.max(
        0,
        virtualizerTotalSize - scrollTop - containerHeight,
      );
      const isAtBottom = distanceFromBottom < 10;

      // Scroll to last item
      virtualizerRef.current?.scrollToIndex(currentLastIndex, {
        align: "end",
        behavior: "auto",
      });

      attempts++;

      // Force minimum attempts to handle virtualizer measurement lag
      if (attempts < minAttempts) {
        timeoutId = setTimeout(scrollToEnd, 150);
        return;
      }

      // After minimum attempts, stop if at bottom
      if (isAtBottom) {
        lastScrolledConversationRef.current = conversationId;
        isScrolling = false;
        onScrollReady?.(true); // Show content now that we're scrolled
        return;
      }

      // Stop if reached max attempts
      if (attempts >= maxAttempts) {
        lastScrolledConversationRef.current = conversationId;
        isScrolling = false;
        onScrollReady?.(true); // Show content even if not perfectly scrolled
        return;
      }

      // Continue retrying
      timeoutId = setTimeout(scrollToEnd, 150);
    };

    // Start scrolling after delay to let items render
    timeoutId = setTimeout(scrollToEnd, 150);

    return () => {
      isScrolling = false;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [conversationId, highlightMessageId, scrollContainer]); // Skip when highlighting specific message

  // Scroll user message to top of viewport on send (ChatGPT-style UX)
  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    prevMessageCountRef.current = messageCount;

    if (messageCount <= prevCount) return;

    const newUserMessage = messages
      .slice(prevCount)
      .find((m) => m.role === "user");

    if (!newUserMessage) return;

    // Find the index in grouped items
    const userMsgIndex = groupedRef.current.findIndex(
      (item) =>
        (item.type === "message" && item.data._id === newUserMessage._id) ||
        (item.type === "comparison" &&
          item.userMessage._id === newUserMessage._id),
    );

    if (userMsgIndex !== -1) {
      requestAnimationFrame(() => {
        virtualizerRef.current.scrollToIndex(userMsgIndex, {
          align: "start",
          behavior: "smooth",
        });
      });
    }
  }, [messages, messageCount]);
}

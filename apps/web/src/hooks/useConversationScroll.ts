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
}

/** Scrolls to bottom on conversation switch, and to new user message on send */
export function useConversationScroll({
  conversationId,
  messageCount,
  highlightMessageId,
  messages,
  virtualizer,
  grouped,
}: UseConversationScrollOptions): void {
  const lastScrolledConversationRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef(messageCount);

  // Refs to avoid stale closures - effect deps stay minimal
  const virtualizerRef = useRef(virtualizer);
  const groupedRef = useRef(grouped);
  virtualizerRef.current = virtualizer;
  groupedRef.current = grouped;

  // Scroll to bottom on conversation switch
  useEffect(() => {
    if (highlightMessageId || !conversationId || messageCount === 0) return;

    const lastIndex = groupedRef.current.length - 1;
    if (lastIndex < 0) return;

    // Skip if already scrolled for this conversation
    if (lastScrolledConversationRef.current === conversationId) return;
    lastScrolledConversationRef.current = conversationId;

    // Use setTimeout to ensure virtualizer has initialized and measured items
    // RAF alone isn't enough when loading from cache (items render synchronously)
    const timeoutId = setTimeout(() => {
      virtualizerRef.current.scrollToIndex(lastIndex, { align: "end" });
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [conversationId, highlightMessageId, messageCount]);

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

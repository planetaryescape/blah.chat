"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";

interface Message {
  _id: string;
  role: string;
}

interface UseConversationScrollOptions {
  containerRef: RefObject<HTMLElement | null>;
  conversationId?: string;
  messageCount: number;
  highlightMessageId?: string;
  messages: Message[];
}

const MAX_SCROLL_ATTEMPTS = 20;
const SCROLL_RETRY_DELAY = 50;
const HINT_OFFSET = 50;

/** Scrolls to bottom on conversation switch, and to new user message on send */
export function useConversationScroll({
  containerRef,
  conversationId,
  messageCount,
  highlightMessageId,
  messages,
}: UseConversationScrollOptions): void {
  const lastScrolledConversationRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef(messageCount);

  // Scroll to bottom on conversation switch
  useEffect(() => {
    if (highlightMessageId || !conversationId || messageCount === 0) return;
    if (lastScrolledConversationRef.current === conversationId) return;

    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tryScroll = () => {
      const container = containerRef.current;
      if (container && container.scrollHeight > container.clientHeight) {
        container.scrollTop = container.scrollHeight;
        lastScrolledConversationRef.current = conversationId;
        return;
      }
      if (++attempts < MAX_SCROLL_ATTEMPTS) {
        timeoutId = setTimeout(tryScroll, SCROLL_RETRY_DELAY);
      }
    };

    const rafId = requestAnimationFrame(tryScroll);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [conversationId, highlightMessageId, messageCount, containerRef]);

  // Scroll to new user message on send
  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    if (messageCount > prevCount) {
      const newUserMessage = messages
        .slice(prevCount)
        .find((m) => m.role === "user");
      if (newUserMessage) {
        requestAnimationFrame(() => {
          const element = document.getElementById(
            `message-${newUserMessage._id}`,
          );
          const container = containerRef.current;
          if (element && container) {
            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const elementTop =
              elementRect.top - containerRect.top + container.scrollTop;
            container.scrollTo({
              top: Math.max(0, elementTop - HINT_OFFSET),
              behavior: "smooth",
            });
          }
        });
      }
    }
    prevMessageCountRef.current = messageCount;
  }, [messages, messageCount, containerRef]);
}

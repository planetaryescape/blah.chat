import { useCallback, useEffect, useRef } from "react";

type MessageLike = {
  _id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  model?: string | null;
  status?: string | null;
};

/**
 * Announces new messages to screen readers via a live region.
 * Returns a ref to attach to the announcer element.
 * Only announces when a message completes (status === "complete" or user message).
 */
export function useMessageAnnouncer(messages: MessageLike[] | undefined) {
  const announcerRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef(0);
  const prevLastIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Announce function with proper cleanup
  const announce = useCallback((message: string) => {
    const announcer = announcerRef.current;
    if (!announcer) return;

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Clear then set after brief delay for reliable announcement
    announcer.textContent = "";
    timeoutRef.current = setTimeout(() => {
      // Check ref is still valid after timeout
      if (announcerRef.current) {
        announcerRef.current.textContent = message;
      }
    }, 100);
  }, []);

  // Watch for new messages and announce them
  useEffect(() => {
    if (!messages || messages.length === 0) {
      prevCountRef.current = 0;
      prevLastIdRef.current = null;
      return;
    }

    const currentCount = messages.length;
    const lastMessage = messages[currentCount - 1];
    const prevCount = prevCountRef.current;
    const prevLastId = prevLastIdRef.current;

    // Detect new message added
    const isNewMessage =
      currentCount > prevCount || lastMessage._id !== prevLastId;

    // Only announce complete messages (not partial/generating)
    const shouldAnnounce =
      isNewMessage &&
      (lastMessage.role === "user" ||
        (lastMessage.role === "assistant" &&
          lastMessage.status === "complete"));

    if (shouldAnnounce) {
      const sender = lastMessage.role === "assistant" ? "Assistant" : "You";
      const model =
        lastMessage.role === "assistant" && lastMessage.model
          ? ` (${lastMessage.model})`
          : "";

      // Truncate long messages
      const preview = lastMessage.content.slice(0, 150);
      const truncated = lastMessage.content.length > 150 ? "..." : "";

      announce(`${sender}${model} said: ${preview}${truncated}`);
    }

    prevCountRef.current = currentCount;
    prevLastIdRef.current = lastMessage._id;
  }, [messages, announce]);

  return { announcerRef };
}

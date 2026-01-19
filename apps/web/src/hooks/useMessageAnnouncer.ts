import { useEffect, useRef } from "react";

type MessageLike = {
  _id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  model?: string | null;
  status?: string | null;
};

/**
 * Announces new messages to screen readers via the message-announcer live region.
 * Only announces when a message completes (status === "complete" or user message).
 */
export function useMessageAnnouncer(messages: MessageLike[] | undefined) {
  const prevCountRef = useRef(0);
  const prevLastIdRef = useRef<string | null>(null);

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
      const announcer = document.getElementById("message-announcer");
      if (announcer) {
        const sender = lastMessage.role === "assistant" ? "Assistant" : "You";
        const model =
          lastMessage.role === "assistant" && lastMessage.model
            ? ` (${lastMessage.model})`
            : "";

        // Truncate long messages
        const preview = lastMessage.content.slice(0, 150);
        const truncated = lastMessage.content.length > 150 ? "..." : "";

        // Clear then set for reliable announcement
        announcer.textContent = "";
        setTimeout(() => {
          announcer.textContent = `${sender}${model} said: ${preview}${truncated}`;
        }, 100);
      }
    }

    prevCountRef.current = currentCount;
    prevLastIdRef.current = lastMessage._id;
  }, [messages]);
}

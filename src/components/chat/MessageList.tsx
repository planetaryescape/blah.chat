"use client";

import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./ChatMessage";

interface MessageListProps {
  messages: Doc<"messages">[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const prevMessageCountRef = useRef(messages.length);
  const hasScrolledToBottomRef = useRef(false);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  // Initial scroll to bottom when messages first load
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledToBottomRef.current) {
      // Use setTimeout to ensure DOM has rendered
      setTimeout(() => {
        scrollToBottom("instant");
        hasScrolledToBottomRef.current = true;
      }, 0);
    }
  }, [messages.length]);

  // Auto-scroll on new messages
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const messageCountIncreased = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (messageCountIncreased) {
      // Always scroll on new message (user or AI)
      scrollToBottom();
      return;
    }

    // Otherwise, scroll if near bottom (for partial updates during streaming)
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;

    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages]);

  // Show scroll button when scrolled up
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        50;
      setShowScrollButton(!isAtBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Send a message to start chatting</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 relative"
    >
      {messages.map((message, index) => {
        const nextMessage = messages[index + 1];
        return (
          <ChatMessage
            key={message._id}
            message={message}
            nextMessage={nextMessage}
          />
        );
      })}
      <div ref={bottomRef} />

      {showScrollButton && (
        <Button
          className="fixed bottom-24 right-8 rounded-full shadow-lg transition-all duration-200"
          size="icon"
          onClick={() => scrollToBottom()}
        >
          <ArrowDown className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

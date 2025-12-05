"use client";

import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { ArrowDown } from "lucide-react";
import { useEffect } from "react";
import { ChatMessage } from "./ChatMessage";

interface MessageListProps {
  messages: Doc<"messages">[];
}

export function MessageList({ messages }: MessageListProps) {
  const { containerRef, scrollToBottom, showScrollButton, isAtBottom } =
    useAutoScroll({
      threshold: 100,
      animationDuration: 400,
    });

  // Scroll on new content (new messages or streaming updates)
  useEffect(() => {
    // Only auto-scroll if user is at bottom (hasn't scrolled up)
    if (isAtBottom) {
      scrollToBottom("smooth");
    }
  }, [
    messages.length,
    messages[messages.length - 1]?.partialContent,
    isAtBottom,
    scrollToBottom,
  ]);

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
      className="flex-1 w-full min-w-0 overflow-y-auto p-4 space-y-4 relative"
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

      {showScrollButton && (
        <Button
          className="fixed bottom-24 right-8 rounded-full shadow-lg transition-all duration-200"
          size="icon"
          onClick={() => scrollToBottom("smooth")}
        >
          <ArrowDown className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

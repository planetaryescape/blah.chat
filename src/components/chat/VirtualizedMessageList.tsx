"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { ChatMessage } from "./ChatMessage";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

interface VirtualizedMessageListProps {
  messages: Doc<"messages">[];
  autoScroll?: boolean;
}

export function VirtualizedMessageList({
  messages,
  autoScroll = true,
}: VirtualizedMessageListProps) {
  const { containerRef, scrollToBottom, showScrollButton } = useAutoScroll({
    threshold: 100,
    animationDuration: 400,
  });

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  const items = virtualizer.getVirtualItems();

  // Scroll on new content
  useEffect(() => {
    if (autoScroll) {
      scrollToBottom("smooth");
    }
  }, [messages.length, messages[messages.length - 1]?.partialContent, autoScroll, scrollToBottom]);

  // Only use virtualization for long conversations
  const useVirtualization = messages.length > 50;

  if (!useVirtualization) {
    // Render normally for short conversations
    return (
      <div ref={containerRef} className="flex flex-col gap-4 px-4 py-6 h-full overflow-auto relative">
        {messages.map((message: any) => (
          <ChatMessage key={message._id} message={message} />
        ))}
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

  return (
    <div ref={containerRef} className="h-full overflow-auto relative">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {items.map((virtualItem) => {
          const message = messages[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="px-4 py-2">
                <ChatMessage message={message} />
              </div>
            </div>
          );
        })}
      </div>
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

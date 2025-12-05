"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { ChatMessage } from "./ChatMessage";

interface VirtualizedMessageListProps {
  messages: Doc<"messages">[];
  autoScroll?: boolean;
}

export function VirtualizedMessageList({
  messages,
  autoScroll = true,
}: VirtualizedMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150, // Estimated height of a message
    overscan: 5, // Number of items to render outside visible area
  });

  const items = virtualizer.getVirtualItems();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, {
        align: "end",
        behavior: "smooth",
      });
    }
  }, [messages.length, autoScroll, virtualizer]);

  // Only use virtualization for long conversations
  const useVirtualization = messages.length > 50;

  if (!useVirtualization) {
    // Render normally for short conversations
    return (
      <div className="flex flex-col gap-4 px-4 py-6">
        {messages.map((message: any) => (
          <ChatMessage key={message._id} message={message} />
        ))}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
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
    </div>
  );
}

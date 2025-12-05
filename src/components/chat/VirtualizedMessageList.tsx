"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { ChatMessage } from "./ChatMessage";
import { ComparisonView } from "./ComparisonView";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface VirtualizedMessageListProps {
  messages: Doc<"messages">[];
  autoScroll?: boolean;
  onVote?: (winnerId: string, rating: string) => void;
  onConsolidate?: (model: string) => void;
  onToggleModelNames?: () => void;
  showModelNames: boolean;
}

export function VirtualizedMessageList({
  messages,
  autoScroll = true,
  onVote,
  onConsolidate,
  onToggleModelNames,
  showModelNames,
}: VirtualizedMessageListProps) {
  const { containerRef, scrollToBottom, showScrollButton, isAtBottom } =
    useAutoScroll({
      threshold: 100,
      animationDuration: 400,
    });

  // Group messages by comparison and preserve chronological order
  const grouped = useMemo(() => {
    // First, group comparison messages by ID
    const comparisonGroups: Record<string, Doc<"messages">[]> = {};

    for (const msg of messages) {
      if (msg.comparisonGroupId) {
        comparisonGroups[msg.comparisonGroupId] ||= [];
        comparisonGroups[msg.comparisonGroupId].push(msg);
      }
    }

    // Build chronological list of items (messages + comparison blocks)
    type Item =
      | { type: "message"; data: Doc<"messages"> }
      | {
          type: "comparison";
          id: string;
          messages: Doc<"messages">[];
          timestamp: number;
        };

    const items: Item[] = [];
    const processedGroups = new Set<string>();

    for (const msg of messages) {
      if (msg.comparisonGroupId) {
        // Only add comparison block once (on first message of group)
        if (!processedGroups.has(msg.comparisonGroupId)) {
          const groupMsgs = comparisonGroups[msg.comparisonGroupId];
          items.push({
            type: "comparison",
            id: msg.comparisonGroupId,
            messages: groupMsgs,
            timestamp: Math.min(...groupMsgs.map((m) => m.createdAt)),
          });
          processedGroups.add(msg.comparisonGroupId);
        }
      } else {
        // Regular message
        items.push({ type: "message", data: msg });
      }
    }

    return items;
  }, [messages]);

  const virtualizer = useVirtualizer({
    count: grouped.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Scroll on new content
  useEffect(() => {
    // Only auto-scroll if user is at bottom and autoScroll enabled
    if (autoScroll && isAtBottom) {
      scrollToBottom("smooth");
    }
  }, [
    messages.length,
    messages[messages.length - 1]?.partialContent,
    autoScroll,
    isAtBottom,
    scrollToBottom,
  ]);

  // Only use virtualization for long conversations
  const useVirtualization = grouped.length > 50;

  if (!useVirtualization) {
    // Render normally for short conversations
    return (
      <div
        ref={containerRef}
        className="flex-1 w-full min-w-0 overflow-y-auto p-4 space-y-4 relative"
        style={{
          contain: "layout style paint",
          contentVisibility: "auto",
        }}
      >
        <AnimatePresence mode="popLayout">
          {grouped.map((item, index) => {
            if (item.type === "message") {
              const nextItem = grouped[index + 1];
              const nextMessage =
                nextItem?.type === "message" ? nextItem.data : undefined;

              return (
                <motion.div
                  key={item.data._id}
                  layout
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                >
                  <ChatMessage message={item.data} nextMessage={nextMessage} />
                </motion.div>
              );
            } else {
              // Comparison block
              return (
                <motion.div
                  key={item.id}
                  layout
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                >
                  <ComparisonView
                    messages={item.messages}
                    comparisonGroupId={item.id}
                    showModelNames={showModelNames}
                    onVote={onVote || (() => {})}
                    onConsolidate={onConsolidate || (() => {})}
                    onToggleModelNames={onToggleModelNames || (() => {})}
                  />
                </motion.div>
              );
            }
          })}
        </AnimatePresence>

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
    <div
      ref={containerRef}
      className="flex-1 w-full min-w-0 overflow-y-auto relative"
      style={{
        contain: "layout style paint",
        contentVisibility: "auto",
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = grouped[virtualItem.index];
          const isMessage = item.type === "message";

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
                {isMessage ? (
                  <ChatMessage
                    message={item.data}
                    nextMessage={(() => {
                      if (virtualItem.index + 1 >= grouped.length)
                        return undefined;
                      const nextItem = grouped[virtualItem.index + 1];
                      return nextItem.type === "message"
                        ? nextItem.data
                        : undefined;
                    })()}
                  />
                ) : (
                  <ComparisonView
                    messages={item.messages}
                    comparisonGroupId={item.id}
                    showModelNames={showModelNames}
                    onVote={onVote || (() => {})}
                    onConsolidate={onConsolidate || (() => {})}
                    onToggleModelNames={onToggleModelNames || (() => {})}
                  />
                )}
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

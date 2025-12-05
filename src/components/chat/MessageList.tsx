"use client";

import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useEffect, useMemo } from "react";
import { ChatMessage } from "./ChatMessage";
import { ComparisonView } from "./ComparisonView";

interface MessageListProps {
  messages: Doc<"messages">[];
  onVote?: (winnerId: string, rating: string) => void;
  onConsolidate?: (model: string) => void;
  onToggleModelNames?: () => void;
  showModelNames: boolean;
}

export function MessageList({
  messages,
  onVote,
  onConsolidate,
  onToggleModelNames,
  showModelNames,
}: MessageListProps) {
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

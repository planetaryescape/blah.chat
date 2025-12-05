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
  showModelNames?: boolean;
}

export function MessageList({
  messages,
  onVote,
  onConsolidate,
  showModelNames = false,
}: MessageListProps) {
  const { containerRef, scrollToBottom, showScrollButton, isAtBottom } =
    useAutoScroll({
      threshold: 100,
      animationDuration: 400,
    });

  // Group messages by comparison
  const grouped = useMemo(() => {
    const regular: Doc<"messages">[] = [];
    const comparisons: Record<string, Doc<"messages">[]> = {};

    for (const msg of messages) {
      if (msg.comparisonGroupId) {
        comparisons[msg.comparisonGroupId] ||= [];
        comparisons[msg.comparisonGroupId].push(msg);
      } else {
        regular.push(msg);
      }
    }

    return { regular, comparisons };
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
        {grouped.regular.map((message, index) => {
          const nextMessage = grouped.regular[index + 1];
          return (
            <motion.div
              key={message._id}
              layout
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <ChatMessage message={message} nextMessage={nextMessage} />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {Object.entries(grouped.comparisons).map(([id, msgs]) => (
        <ComparisonView
          key={id}
          messages={msgs}
          comparisonGroupId={id}
          showModelNames={showModelNames}
          onVote={onVote || (() => {})}
          onConsolidate={onConsolidate || (() => {})}
        />
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

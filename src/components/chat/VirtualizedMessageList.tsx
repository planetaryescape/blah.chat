"use client";

import { Button } from "@/components/ui/button";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Fragment, useEffect, useMemo } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { ChatMessage } from "./ChatMessage";
import { ComparisonView } from "./ComparisonView";
import { EmptyScreen } from "./EmptyScreen";

interface VirtualizedMessageListProps {
  messages: Doc<"messages">[];
  selectedModel?: string;
  autoScroll?: boolean;
  onVote?: (winnerId: string, rating: string) => void;
  onConsolidate?: (model: string, mode: "same-chat" | "new-chat") => void;
  onToggleModelNames?: () => void;
  showModelNames: boolean;
}

export function VirtualizedMessageList({
  messages,
  selectedModel,
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
    // FILTER: Remove assistant messages that have been consolidated
    const visibleMessages = messages.filter(
      (m) => !(m.role === "assistant" && m.consolidatedMessageId),
    );

    // First, group comparison messages by ID
    const comparisonGroups: Record<string, Doc<"messages">[]> = {};

    for (const msg of visibleMessages) {
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
          userMessage: Doc<"messages">;
          assistantMessages: Doc<"messages">[];
          timestamp: number;
        };

    const items: Item[] = [];
    const processedGroups = new Set<string>();

    for (const msg of visibleMessages) {
      if (msg.comparisonGroupId) {
        // Only add comparison block once (on first message of group)
        if (!processedGroups.has(msg.comparisonGroupId)) {
          const groupMsgs = comparisonGroups[msg.comparisonGroupId];
          const userMessage = groupMsgs.find((m) => m.role === "user");
          const assistantMessages = groupMsgs.filter(
            (m) => m.role === "assistant",
          );

          if (userMessage && assistantMessages.length > 0) {
            items.push({
              type: "comparison",
              id: msg.comparisonGroupId,
              userMessage,
              assistantMessages,
              timestamp: Math.min(...groupMsgs.map((m) => m.createdAt)),
            });
          } else if (userMessage && assistantMessages.length === 0) {
            // Consolidated case: no assistant messages left, render user message as regular
            items.push({ type: "message", data: userMessage });
          }
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

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyScreen
          selectedModel={selectedModel}
          onClick={(val: string) => {
            const event = new CustomEvent("insert-prompt", { detail: val });
            window.dispatchEvent(event);
          }}
        />
      </div>
    );
  }

  // Only use virtualization for long conversations
  const useVirtualization = grouped.length > 50;

  if (!useVirtualization) {
    // Render normally for short conversations
    return (
      <div className="flex-1 w-full min-w-0 relative flex flex-col overflow-hidden">
        <div
          ref={containerRef}
          role="log"
          aria-live="polite"
          aria-label="Chat message history"
          aria-atomic="false"
          className="flex-1 w-full min-w-0 overflow-y-auto relative"
          style={{
            contain: "layout style paint",
            contentVisibility: "auto",
          }}
        >
          <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
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
                      transition={{
                        type: "spring",
                        damping: 25,
                        stiffness: 200,
                      }}
                    >
                      <ChatMessage
                        message={item.data}
                        nextMessage={nextMessage}
                      />
                    </motion.div>
                  );
                } else {
                  // Comparison block: user message + comparison panels
                  return (
                    <Fragment key={item.id}>
                      <motion.div
                        key={item.userMessage._id}
                        layout
                        transition={{
                          type: "spring",
                          damping: 25,
                          stiffness: 200,
                        }}
                      >
                        <ChatMessage message={item.userMessage} />
                      </motion.div>
                      <motion.div
                        key={`comparison-${item.id}`}
                        layout
                        transition={{
                          type: "spring",
                          damping: 25,
                          stiffness: 200,
                        }}
                      >
                        <ComparisonView
                          assistantMessages={item.assistantMessages}
                          comparisonGroupId={item.id}
                          showModelNames={showModelNames}
                          onVote={onVote || (() => {})}
                          onConsolidate={onConsolidate || (() => {})}
                          onToggleModelNames={onToggleModelNames || (() => {})}
                        />
                      </motion.div>
                    </Fragment>
                  );
                }
              })}
            </AnimatePresence>
          </div>
        </div>

        {showScrollButton && (
          <Button
            className="absolute bottom-4 right-8 rounded-full shadow-lg transition-all duration-200 z-10"
            size="icon"
            onClick={() => scrollToBottom("smooth")}
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 w-full min-w-0 relative flex flex-col overflow-hidden">
      <div
        ref={containerRef}
        role="log"
        aria-live="polite"
        aria-label="Chat message history"
        aria-atomic="false"
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
                <div className="w-full max-w-4xl mx-auto px-4 py-2">
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
                    <>
                      <ChatMessage message={item.userMessage} />
                      <div className="mt-4">
                        <ComparisonView
                          assistantMessages={item.assistantMessages}
                          comparisonGroupId={item.id}
                          showModelNames={showModelNames}
                          onVote={onVote || (() => {})}
                          onConsolidate={onConsolidate || (() => {})}
                          onToggleModelNames={onToggleModelNames || (() => {})}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {showScrollButton && (
        <Button
          className="absolute bottom-4 right-8 rounded-full shadow-lg transition-all duration-200 z-10"
          size="icon"
          onClick={() => scrollToBottom("smooth")}
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { cn } from "@/lib/utils";
import { type ChatWidth } from "@/lib/utils/chatWidth";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { ChatMessage } from "./ChatMessage";
import { ComparisonView } from "./ComparisonView";
import { EmptyScreen } from "./EmptyScreen";

/**
 * Generate a stable React key for messages that persists across optimistic→server transition.
 *
 * Uses timestamp+role for ALL messages to ensure the key is identical between
 * the optimistic version and the server-confirmed version. This prevents React
 * from treating them as different elements and avoids flash during transition.
 */
function getStableMessageKey(message: Doc<"messages">): string {
  // Always use timestamp + role key - this ensures optimistic and server
  // versions of the same message share the same key
  const timestampKey = Math.floor(message.createdAt / 1000);
  return `msg-${message.role}-${timestampKey}`;
}

interface VirtualizedMessageListProps {
  messages: Doc<"messages">[];
  selectedModel?: string;
  autoScroll?: boolean;
  onVote?: (winnerId: string, rating: string) => void;
  onConsolidate?: (model: string, mode: "same-chat" | "new-chat") => void;
  onToggleModelNames?: () => void;
  showModelNames: boolean;
  highlightMessageId?: string;
  syncScroll?: boolean;
  chatWidth?: ChatWidth;
}

export function VirtualizedMessageList({
  messages,
  selectedModel,
  autoScroll = true,
  onVote,
  onConsolidate,
  onToggleModelNames,
  showModelNames,
  chatWidth,
  highlightMessageId,
  syncScroll = true,
}: VirtualizedMessageListProps) {
  const { containerRef, scrollToBottom, showScrollButton, isAtBottom } =
    useAutoScroll({
      threshold: 100,
      animationDuration: 400,
    });

  // Track if we've scrolled to highlighted message
  const scrolledToHighlight = useRef(false);

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

  // Scroll to highlighted message - non-virtualized (<50 messages)
  useEffect(() => {
    if (
      !highlightMessageId ||
      scrolledToHighlight.current ||
      grouped.length > 50
    )
      return;

    const scrollToMessage = () => {
      const element = document.getElementById(`message-${highlightMessageId}`);
      if (!element) {
        setTimeout(scrollToMessage, 100); // Retry
        return;
      }

      element.scrollIntoView({ behavior: "smooth", block: "start" });
      element.classList.add("message-highlight");
      setTimeout(() => element.classList.remove("message-highlight"), 2000);

      scrolledToHighlight.current = true;
    };

    scrollToMessage();
  }, [highlightMessageId, grouped.length]);

  // Scroll to highlighted message - virtualized (>50 messages)
  useEffect(() => {
    if (
      !highlightMessageId ||
      scrolledToHighlight.current ||
      grouped.length <= 50
    )
      return;

    const targetIndex = grouped.findIndex((item) => {
      if (item.type === "message") return item.data._id === highlightMessageId;
      if (item.type === "comparison") {
        return (
          item.userMessage._id === highlightMessageId ||
          item.assistantMessages.some((m) => m._id === highlightMessageId)
        );
      }
      return false;
    });

    if (targetIndex === -1) return;

    virtualizer.scrollToIndex(targetIndex, {
      align: "start",
      behavior: "smooth",
    });

    setTimeout(() => {
      const element = document.getElementById(`message-${highlightMessageId}`);
      if (element) {
        element.classList.add("message-highlight");
        setTimeout(() => element.classList.remove("message-highlight"), 2000);
      }
    }, 500);

    scrolledToHighlight.current = true;
  }, [highlightMessageId, grouped, virtualizer]);

  // Reset scroll tracking when highlightMessageId changes
  useEffect(() => {
    scrolledToHighlight.current = false;
  }, []);

  // Scroll on new content
  useEffect(() => {
    // Skip auto-scroll if highlighting a specific message from URL
    if (highlightMessageId) return;

    // Only auto-scroll if user is at bottom and autoScroll enabled
    if (autoScroll && isAtBottom) {
      scrollToBottom("smooth");
    }
  }, [messages.length, autoScroll, isAtBottom, scrollToBottom, highlightMessageId]);

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
            scrollPaddingTop: "80px",
          }}
        >
          <div
            className={cn(
              "grid gap-4 p-4 transition-all duration-300 ease-out",
              // Grid columns based on width preference
              chatWidth === "narrow" && "grid-cols-[1fr_min(42rem,100%)_1fr]",
              chatWidth === "standard" && "grid-cols-[1fr_min(56rem,100%)_1fr]",
              chatWidth === "wide" && "grid-cols-[1fr_min(72rem,100%)_1fr]",
              chatWidth === "full" && "grid-cols-[1fr_min(95%,100%)_1fr]",
              !chatWidth && "grid-cols-[1fr_min(56rem,100%)_1fr]", // fallback
            )}
          >
            <>
              {grouped.map((item, index) => {
                if (item.type === "message") {
                  const nextItem = grouped[index + 1];
                  const nextMessage =
                    nextItem?.type === "message" ? nextItem.data : undefined;

                  return (
                    <div
                      key={getStableMessageKey(item.data)}
                      className="col-start-2"
                    >
                      <ChatMessage
                        message={item.data}
                        nextMessage={nextMessage}
                      />
                    </div>
                  );
                } else {
                  // Comparison block: user message + comparison panels
                  return (
                    <Fragment key={item.id}>
                      <div
                        key={getStableMessageKey(item.userMessage)}
                        className="col-start-2"
                      >
                        <ChatMessage message={item.userMessage} />
                      </div>
                      <div
                        key={`comparison-${item.id}`}
                        className="col-span-full"
                      >
                        <ComparisonView
                          assistantMessages={item.assistantMessages}
                          comparisonGroupId={item.id}
                          showModelNames={showModelNames}
                          onVote={onVote || (() => {})}
                          onConsolidate={onConsolidate || (() => {})}
                          onToggleModelNames={onToggleModelNames || (() => {})}
                        />
                      </div>
                    </Fragment>
                  );
                }
              })}
            </>
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
          scrollPaddingTop: "80px",
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
                <div
                  className={cn(
                    "grid gap-2 px-4 py-2 transition-all duration-300 ease-out",
                    chatWidth === "narrow" &&
                      "grid-cols-[1fr_min(42rem,100%)_1fr]",
                    chatWidth === "standard" &&
                      "grid-cols-[1fr_min(56rem,100%)_1fr]",
                    chatWidth === "wide" &&
                      "grid-cols-[1fr_min(72rem,100%)_1fr]",
                    chatWidth === "full" && "grid-cols-[1fr_min(95%,100%)_1fr]",
                    !chatWidth && "grid-cols-[1fr_min(56rem,100%)_1fr]",
                  )}
                >
                  {isMessage ? (
                    <div className="col-start-2">
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
                    </div>
                  ) : (
                    <>
                      <div className="col-start-2">
                        <ChatMessage message={item.userMessage} />
                      </div>
                      <div className="col-span-full mt-4">
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

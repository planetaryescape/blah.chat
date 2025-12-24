"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useUserPreference } from "@/hooks/useUserPreference";
import { useConversations } from "@/lib/hooks/queries/useConversations";
import { cn } from "@/lib/utils";
import type { ChatWidth } from "@/lib/utils/chatWidth";
import type { Doc } from "../../../convex/_generated/dataModel";
import { ChatMessage } from "./ChatMessage";
import { ComparisonView } from "./ComparisonView";
import { EmptyScreen } from "./EmptyScreen";

type MessageWithUser = Doc<"messages"> & {
  senderUser?: { name?: string; imageUrl?: string } | null;
};

/**
 * Generate a stable React key for messages that persists across optimistic→server transition.
 *
 * Uses timestamp+role+model for messages to ensure keys are unique but still match
 * between optimistic and server-confirmed versions. This prevents React from treating
 * them as different elements and avoids flash during transition.
 *
 * For comparison mode, model is included to prevent collisions between multiple
 * assistant messages created at nearly the same time.
 */
function getStableMessageKey(message: Doc<"messages">): string {
  // Use 100ms granularity instead of 1s to reduce collisions
  const timestampKey = Math.floor(message.createdAt / 100);
  // Include model for assistant messages to handle comparison mode
  const modelSuffix =
    message.role === "assistant" && message.model ? `-${message.model}` : "";
  return `msg-${message.role}-${timestampKey}${modelSuffix}`;
}

interface VirtualizedMessageListProps {
  messages: MessageWithUser[];
  selectedModel?: string;
  onVote?: (winnerId: string, rating: string) => void;
  onConsolidate?: (model: string, mode: "same-chat" | "new-chat") => void;
  onToggleModelNames?: () => void;
  showModelNames: boolean;
  highlightMessageId?: string;
  chatWidth?: ChatWidth;
  isCollaborative?: boolean;
  isGenerating?: boolean;
  isInitialLoadComplete?: boolean;
}

export function VirtualizedMessageList({
  messages,
  selectedModel,
  onVote,
  onConsolidate,
  onToggleModelNames,
  showModelNames,
  chatWidth,
  highlightMessageId,
  isCollaborative,
  isGenerating,
  isInitialLoadComplete = true,
}: VirtualizedMessageListProps) {
  const { containerRef, scrollToBottom, showScrollButton } = useAutoScroll({
    threshold: 100,
    animationDuration: 400,
    disableAutoScroll: true, // Never auto-scroll during streaming - user reads at own pace
  });

  // Fetch conversation count and nickname for EmptyScreen
  const { data: conversationsData } = useConversations();
  const conversationCount =
    (conversationsData as { items?: unknown[] } | undefined)?.items?.length ??
    0;
  const customInstructions = useUserPreference("customInstructions");
  const nickname =
    (customInstructions as { nickname?: string } | undefined)?.nickname || "";

  // Track if we've scrolled to highlighted message
  const scrolledToHighlight = useRef(false);

  // Track last scrolled conversation to avoid re-scrolling on re-renders
  const lastScrolledConversationRef = useRef<string | null>(null);

  // Track previous message count for user message scroll detection
  const prevMessageCountRef = useRef(messages.length);

  // Derive conversationId for stable dependency
  const conversationId = messages[0]?.conversationId;

  // Group messages by comparison and preserve chronological order
  const grouped = useMemo(() => {
    // FILTER: Remove assistant messages that have been consolidated
    const visibleMessages = messages.filter(
      (m) => !(m.role === "assistant" && m.consolidatedMessageId),
    );

    // First, group comparison messages by ID
    const comparisonGroups: Record<string, MessageWithUser[]> = {};

    for (const msg of visibleMessages) {
      if (msg.comparisonGroupId) {
        comparisonGroups[msg.comparisonGroupId] ||= [];
        comparisonGroups[msg.comparisonGroupId].push(msg);
      }
    }

    // Build chronological list of items (messages + comparison blocks)
    type Item =
      | { type: "message"; data: MessageWithUser }
      | {
          type: "comparison";
          id: string;
          userMessage: MessageWithUser;
          assistantMessages: MessageWithUser[];
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
      const container = containerRef.current;
      if (!element || !container) {
        setTimeout(scrollToMessage, 100); // Retry
        return;
      }

      // Use manual calculation for reliable positioning (same as user message scroll)
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const elementTop =
        elementRect.top - containerRect.top + container.scrollTop;
      const hintOffset = 80; // Show 80px of previous content

      container.scrollTo({
        top: Math.max(0, elementTop - hintOffset),
        behavior: "smooth",
      });

      element.classList.add("message-highlight");
      setTimeout(() => element.classList.remove("message-highlight"), 1200);

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

    // First scroll to approximate position via virtualizer
    virtualizer.scrollToIndex(targetIndex, {
      align: "start",
      behavior: "smooth",
    });

    // After virtualizer scroll, adjust position with 80px offset and add highlight
    setTimeout(() => {
      const element = document.getElementById(`message-${highlightMessageId}`);
      const container = containerRef.current;
      if (element && container) {
        // Use manual calculation for precise positioning
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const elementTop =
          elementRect.top - containerRect.top + container.scrollTop;
        const hintOffset = 80;

        container.scrollTo({
          top: Math.max(0, elementTop - hintOffset),
          behavior: "smooth",
        });

        element.classList.add("message-highlight");
        setTimeout(() => element.classList.remove("message-highlight"), 1200);
      }
    }, 300); // Wait for virtualizer scroll to complete

    scrolledToHighlight.current = true;
  }, [highlightMessageId, grouped, virtualizer]);

  // Reset scroll tracking when highlightMessageId changes
  useEffect(() => {
    scrolledToHighlight.current = false;
  }, [highlightMessageId]);

  // Scroll to bottom on conversation load/switch
  // Retries until content is actually scrollable (virtualizer done measuring)
  useEffect(() => {
    // Skip if highlighting specific message (that effect handles scroll)
    if (highlightMessageId) return;
    if (!conversationId) return;
    if (messages.length === 0) return;
    // Wait until initial load is complete
    if (!isInitialLoadComplete) return;
    // Only scroll once per conversation
    if (lastScrolledConversationRef.current === conversationId) return;

    let attempts = 0;
    const maxAttempts = 20; // ~1 second max (20 * 50ms)
    let timeoutId: ReturnType<typeof setTimeout>;

    const tryScroll = () => {
      const container = containerRef.current;
      if (container && container.scrollHeight > container.clientHeight) {
        container.scrollTop = container.scrollHeight;
        lastScrolledConversationRef.current = conversationId;
        return; // Success
      }

      // Retry if content not ready yet
      attempts++;
      if (attempts < maxAttempts) {
        timeoutId = setTimeout(tryScroll, 50);
      }
    };

    // Start trying after first frame
    const rafId = requestAnimationFrame(tryScroll);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [
    conversationId,
    highlightMessageId,
    messages.length,
    isInitialLoadComplete,
  ]);

  // Scroll to user message when sending a new message
  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    const currentCount = messages.length;

    // Detect new messages added
    if (currentCount > prevCount) {
      // Find new user message in the added messages
      const newMessages = messages.slice(prevCount);
      const newUserMessage = newMessages.find((m) => m.role === "user");

      if (newUserMessage) {
        // Scroll to show user message at top with offset
        requestAnimationFrame(() => {
          const element = document.getElementById(
            `message-${newUserMessage._id}`,
          );
          const container = containerRef.current;
          if (element && container) {
            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const elementTop =
              elementRect.top - containerRect.top + container.scrollTop;
            const hintOffset = 50; // Show 50px of previous content

            container.scrollTo({
              top: Math.max(0, elementTop - hintOffset),
              behavior: "smooth",
            });
          }
        });
      }
    }

    prevMessageCountRef.current = currentCount;
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyScreen
          selectedModel={selectedModel}
          conversationCount={conversationCount}
          nickname={nickname}
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
      <div className="flex-1 max-h-full min-h-0 min-w-0 relative flex flex-col overflow-hidden">
        <div
          ref={containerRef}
          role="log"
          aria-live="polite"
          aria-label="Chat message history"
          aria-atomic="false"
          className="flex-1 w-full min-w-0 min-h-0 overflow-y-auto relative"
          style={{
            contain: "layout style paint",
            contentVisibility: "auto",
          }}
        >
          <div
            className={cn(
              "grid gap-4 p-4 transition-all duration-300 ease-out",
              // Extra padding during generation to allow scrolling user message to top
              isGenerating && "pb-[80vh]",
              // Grid columns based on width preference
              chatWidth === "narrow" && "grid-cols-[1fr_min(42rem,100%)_1fr]",
              chatWidth === "standard" && "grid-cols-[1fr_min(56rem,100%)_1fr]",
              chatWidth === "wide" && "grid-cols-[1fr_min(72rem,100%)_1fr]",
              chatWidth === "full" && "grid-cols-[1fr_min(95%,100%)_1fr]",
              !chatWidth && "grid-cols-[1fr_min(56rem,100%)_1fr]", // fallback
            )}
          >
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
                      isCollaborative={isCollaborative}
                      senderUser={item.data.senderUser}
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
                      <ChatMessage
                        message={item.userMessage}
                        isCollaborative={isCollaborative}
                        senderUser={item.userMessage.senderUser}
                      />
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
          </div>
        </div>

        {showScrollButton && (
          <Button
            variant="outline"
            size="sm"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg transition-all duration-200 z-10 gap-1"
            onClick={() => scrollToBottom("smooth")}
            aria-label="Scroll to bottom"
          >
            Scroll to bottom
            <ArrowDown className="w-3 h-3" aria-hidden="true" />
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
          className={cn(isGenerating && "pb-[80vh]")}
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
                        isCollaborative={isCollaborative}
                        senderUser={item.data.senderUser}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="col-start-2">
                        <ChatMessage
                          message={item.userMessage}
                          isCollaborative={isCollaborative}
                          senderUser={item.userMessage.senderUser}
                        />
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
          variant="outline"
          size="sm"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg transition-all duration-200 z-10 gap-1"
          onClick={() => scrollToBottom("smooth")}
          aria-label="Scroll to bottom"
        >
          Scroll to bottom
          <ArrowDown className="w-3 h-3" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

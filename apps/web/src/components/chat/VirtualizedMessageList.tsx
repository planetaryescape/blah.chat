"use client";

import { ArrowDown } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { Button } from "@/components/ui/button";
import { useMetadataCacheSync } from "@/hooks/useCacheSync";
import {
  type GroupedItem,
  useMessageGrouping,
} from "@/hooks/useMessageGrouping";
import { useMessageNavigation } from "@/hooks/useMessageNavigation";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useScrollAnchor } from "@/hooks/useScrollAnchor";
import { useScrollIntent } from "@/hooks/useScrollIntent";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useUserPreference } from "@/hooks/useUserPreference";
import { scrollToBottom as smoothScrollToBottom } from "@/lib/smooth-scroll";
import { cn } from "@/lib/utils";
import type { ChatWidth } from "@/lib/utils/chatWidth";
import type { OptimisticMessage } from "@/types/optimistic";
import { ChatMessage, type MessageConversationContext } from "./ChatMessage";
import { ComparisonView } from "./ComparisonView";
import { DateSeparator } from "./DateSeparator";
import { IntegrationTimelineEvent } from "./IntegrationTimelineEvent";

const VIRTUALIZATION_THRESHOLD = 500;
const NEAR_BOTTOM_THRESHOLD = 64;

type MessageWithUser = (any | OptimisticMessage) & {
  senderUser?: { name?: string; imageUrl?: string } | null;
};

type IntegrationEventEntry = {
  _id: string;
  integrationId: string;
  integrationName: string;
  action: "enabled" | "disabled";
  createdAt: number;
};

function isIntegrationEventEntry(
  value: MessageWithUser | IntegrationEventEntry,
): value is IntegrationEventEntry {
  return !("role" in value);
}

interface VirtualizedMessageListProps {
  messages: Array<MessageWithUser | IntegrationEventEntry>;
  conversationId: string;
  conversation?: MessageConversationContext | null;
  onVote?: (
    winnerId: string | undefined,
    outcome: "winner" | "tie" | "both_bad",
  ) => void | Promise<void>;
  onConsolidate?: (model: string, mode: "same-chat" | "new-chat") => void;
  onToggleModelNames?: () => void;
  showModelNames: boolean;
  highlightMessageId?: string;
  chatWidth?: ChatWidth;
  isCollaborative?: boolean;
  onScrollReady?: (ready: boolean) => void;
  /** Whether AI is currently generating a response (for aria-busy) */
  isGenerating?: boolean;
}

export function VirtualizedMessageList({
  messages,
  conversationId,
  conversation,
  onVote,
  onConsolidate,
  onToggleModelNames,
  showModelNames,
  chatWidth,
  highlightMessageId,
  isCollaborative,
  onScrollReady,
  isGenerating = false,
}: VirtualizedMessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const [_atBottom, setAtBottom] = useState(true);

  // Velocity-based scroll intent detection
  const { escapedFromBottom, autoScrollEnabled, enableAutoScroll } =
    useScrollIntent({ scrollerRef });

  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          isIntegrationEventEntry(message) ||
          !!message.comparisonGroupId ||
          !("isActiveBranch" in message) ||
          message.isActiveBranch !== false,
      ),
    [messages],
  );
  const grouped = useMessageGrouping(visibleMessages, conversationId);
  const useVirtualization = grouped.length >= VIRTUALIZATION_THRESHOLD;
  const _reducedMotion = usePrefersReducedMotion();

  // Scroll anchoring fallback for Safari (only in simple mode, Virtuoso handles its own)
  useScrollAnchor(scrollContainerRef, !useVirtualization);

  // Vim-style j/k navigation between message groups
  const scrollToIndex = useCallback(
    (index: number) => {
      if (useVirtualization && virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({
          index,
          align: "center",
          behavior: _reducedMotion ? "auto" : "smooth",
        });
      }
    },
    [useVirtualization, _reducedMotion],
  );

  useMessageNavigation({
    groupedCount: grouped.length,
    enabled: grouped.length > 0,
    scrollToIndex: useVirtualization ? scrollToIndex : undefined,
    isVirtualized: useVirtualization,
  });

  // Scroll position restoration per conversation
  const { restore: restoreScrollPosition } = useScrollRestoration(
    conversationId,
    scrollerRef,
    virtuosoRef,
  );

  // Lift preference here to avoid memo blocking updates in ChatMessage
  const showMessageStats = useUserPreference("showMessageStatistics");

  // Batch sync message metadata (attachments, toolCalls, sources) to local cache
  const messageIds = useMemo(
    () =>
      (messages ?? [])
        .filter(
          (m) =>
            !isIntegrationEventEntry(m) && !String(m._id).startsWith("temp-"),
        )
        .map((m) => m._id as string),
    [messages],
  );
  useMetadataCacheSync(messageIds);

  // Track which conversation we've scrolled for
  const scrolledForConversationRef = useRef<string | undefined>(undefined);

  // Scroll to saved position or bottom when conversation changes
  useEffect(() => {
    if (grouped.length === 0) return;
    if (scrolledForConversationRef.current === conversationId) return;
    scrolledForConversationRef.current = conversationId;

    // Try restore saved position first
    const restored = restoreScrollPosition();
    if (restored) {
      onScrollReady?.(true);
      return;
    }

    // No saved position - scroll to bottom
    if (!useVirtualization && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      setTimeout(() => {
        smoothScrollToBottom(container, {
          smooth: !_reducedMotion,
          duration: 300,
        });
      }, 50);
    } else if (useVirtualization) {
      const scrollToEnd = () => {
        virtuosoRef.current?.scrollToIndex({
          index: grouped.length - 1,
          align: "end",
          behavior: "auto",
        });
      };
      scrollToEnd();
      requestAnimationFrame(scrollToEnd);
      setTimeout(scrollToEnd, 50);
      setTimeout(scrollToEnd, 150);
    }

    onScrollReady?.(true);
  }, [
    conversationId,
    grouped.length,
    useVirtualization,
    onScrollReady,
    _reducedMotion,
    restoreScrollPosition,
  ]);

  // Track scroll position for "scroll to bottom" button (simple mode)
  useEffect(() => {
    if (useVirtualization || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const handleScroll = () => {
      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;
      setAtBottom(isAtBottom);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [useVirtualization]);

  // Highlight message scroll
  useEffect(() => {
    if (!highlightMessageId || grouped.length === 0) return;

    const index = grouped.findIndex((item) => {
      if (item.type === "date-separator") return false;
      if (item.type === "message") {
        return String(item.data._id) === highlightMessageId;
      }
      if (item.type === "integration-event") {
        return String(item.data._id) === highlightMessageId;
      }
      return (
        String(item.userMessage._id) === highlightMessageId ||
        item.assistantMessages.some((m) => String(m._id) === highlightMessageId)
      );
    });

    if (index === -1) return;

    if (useVirtualization) {
      virtuosoRef.current?.scrollToIndex({
        index,
        align: "start",
        behavior: _reducedMotion ? "auto" : "smooth",
      });
    } else if (scrollContainerRef.current) {
      const element = document.getElementById(`message-group-${index}`);
      element?.scrollIntoView({
        behavior: _reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }
  }, [highlightMessageId, grouped, useVirtualization, _reducedMotion]);

  const scrollToBottom = useCallback(() => {
    if (useVirtualization) {
      virtuosoRef.current?.scrollToIndex({
        index: grouped.length - 1,
        align: "end",
        behavior: _reducedMotion ? "auto" : "smooth",
      });
    } else if (scrollContainerRef.current) {
      smoothScrollToBottom(scrollContainerRef.current, {
        smooth: !_reducedMotion,
        duration: 300,
      });
    }
  }, [grouped.length, useVirtualization, _reducedMotion]);

  useEffect(() => {
    const handleComposerResize = () => {
      if (!autoScrollEnabled) return;
      scrollToBottom();
    };

    window.addEventListener("chat-composer-resize", handleComposerResize);
    return () =>
      window.removeEventListener("chat-composer-resize", handleComposerResize);
  }, [autoScrollEnabled, scrollToBottom]);

  // Empty state handled by parent
  if (!messages || messages.length === 0) {
    return null;
  }

  // Simple rendering for small conversations
  if (!useVirtualization) {
    return (
      <>
        <div
          ref={(el) => {
            scrollContainerRef.current = el;
            scrollerRef.current = el;
          }}
          id="chat-messages"
          className="messages-container flex-1 w-full min-w-0 min-h-0 overflow-y-auto"
          role="log"
          aria-live="polite"
          aria-busy={isGenerating}
          aria-label="Chat message history"
        >
          {grouped.map((item, index) => (
            <MessageItemContent
              key={
                item.type === "comparison"
                  ? item.id
                  : item.type === "date-separator"
                    ? `date-${item.timestamp}`
                    : item.type === "integration-event"
                      ? `integration-event-${item.data._id}`
                      : String(item.data._id)
              }
              item={item}
              index={index}
              grouped={grouped}
              chatWidth={chatWidth}
              isCollaborative={isCollaborative}
              showModelNames={showModelNames}
              showMessageStats={showMessageStats}
              onVote={onVote}
              onConsolidate={onConsolidate}
              onToggleModelNames={onToggleModelNames}
              conversation={conversation}
            />
          ))}
        </div>
        {escapedFromBottom && (
          <Button
            variant="outline"
            size="sm"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg transition-all duration-200 z-10 gap-1"
            onClick={() => {
              enableAutoScroll();
              scrollToBottom();
            }}
            aria-label="Jump to latest"
          >
            Jump to latest
            <ArrowDown className="w-3 h-3" aria-hidden="true" />
          </Button>
        )}
      </>
    );
  }

  // Virtualized rendering for large conversations
  return (
    <>
      <Virtuoso
        ref={virtuosoRef}
        scrollerRef={(el) => {
          scrollerRef.current = el instanceof HTMLElement ? el : null;
        }}
        data={grouped}
        computeItemKey={(_index, item) =>
          item.type === "comparison"
            ? item.id
            : item.type === "date-separator"
              ? `date-${item.timestamp}`
              : item.type === "integration-event"
                ? `integration-event-${item.data._id}`
                : item.data._id
        }
        defaultItemHeight={190}
        increaseViewportBy={{ top: 300, bottom: 300 }}
        initialTopMostItemIndex={grouped.length - 1}
        alignToBottom
        followOutput={(isAtBottom) =>
          autoScrollEnabled &&
          (isAtBottom ||
            (scrollerRef.current instanceof HTMLElement &&
              scrollerRef.current.scrollHeight -
                scrollerRef.current.clientHeight -
                scrollerRef.current.scrollTop <=
                NEAR_BOTTOM_THRESHOLD))
            ? "smooth"
            : false
        }
        atBottomStateChange={setAtBottom}
        atBottomThreshold={NEAR_BOTTOM_THRESHOLD}
        id="chat-messages"
        className="flex-1 w-full min-w-0 min-h-0"
        role="log"
        aria-live="polite"
        aria-busy={isGenerating}
        aria-label="Chat message history"
        itemContent={(index, item) => (
          <MessageItemContent
            key={
              item.type === "comparison"
                ? item.id
                : item.type === "date-separator"
                  ? `date-${item.timestamp}`
                  : item.type === "integration-event"
                    ? `integration-event-${item.data._id}`
                    : String(item.data._id)
            }
            item={item}
            index={index}
            grouped={grouped}
            chatWidth={chatWidth}
            isCollaborative={isCollaborative}
            showModelNames={showModelNames}
            showMessageStats={showMessageStats}
            onVote={onVote}
            onConsolidate={onConsolidate}
            onToggleModelNames={onToggleModelNames}
            conversation={conversation}
          />
        )}
      />
      {escapedFromBottom && (
        <Button
          variant="outline"
          size="sm"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg transition-all duration-200 z-10 gap-1"
          onClick={() => {
            enableAutoScroll();
            scrollToBottom();
          }}
          aria-label="Jump to latest"
        >
          Jump to latest
          <ArrowDown className="w-3 h-3" aria-hidden="true" />
        </Button>
      )}
    </>
  );
}

// Memoized item content to prevent unnecessary re-renders
interface MessageItemContentProps {
  item: GroupedItem;
  index: number;
  grouped: GroupedItem[];
  chatWidth?: ChatWidth;
  isCollaborative?: boolean;
  showModelNames: boolean;
  showMessageStats: boolean;
  onVote?: (
    winnerId: string | undefined,
    outcome: "winner" | "tie" | "both_bad",
  ) => void | Promise<void>;
  onConsolidate?: (model: string, mode: "same-chat" | "new-chat") => void;
  onToggleModelNames?: () => void;
  conversation?: MessageConversationContext | null;
}

const MessageItemContent = memo(function MessageItemContent({
  item,
  index,
  grouped,
  chatWidth,
  isCollaborative,
  showModelNames,
  showMessageStats,
  onVote,
  onConsolidate,
  onToggleModelNames,
  conversation,
}: MessageItemContentProps) {
  const getNextMessage = useCallback(() => {
    if (index + 1 >= grouped.length) return undefined;
    const nextItem = grouped[index + 1];
    return nextItem.type === "message" ? nextItem.data : undefined;
  }, [index, grouped]);

  if (item.type === "date-separator") {
    return (
      <div
        id={`message-group-${index}`}
        className={cn(
          "grid px-4",
          chatWidth === "narrow" && "grid-cols-[1fr_min(42rem,100%)_1fr]",
          chatWidth === "standard" && "grid-cols-[1fr_min(56rem,100%)_1fr]",
          chatWidth === "wide" && "grid-cols-[1fr_min(72rem,100%)_1fr]",
          chatWidth === "full" && "grid-cols-[1fr_min(92%,100%)_1fr]",
          !chatWidth && "grid-cols-[1fr_min(56rem,100%)_1fr]",
        )}
      >
        <div className="col-start-2">
          <DateSeparator timestamp={item.timestamp} />
        </div>
      </div>
    );
  }

  if (item.type === "integration-event") {
    return (
      <div
        id={`message-group-${index}`}
        className={cn(
          "grid gap-4 px-4 py-2",
          chatWidth === "narrow" && "grid-cols-[1fr_min(42rem,100%)_1fr]",
          chatWidth === "standard" && "grid-cols-[1fr_min(56rem,100%)_1fr]",
          chatWidth === "wide" && "grid-cols-[1fr_min(72rem,100%)_1fr]",
          chatWidth === "full" && "grid-cols-[1fr_min(92%,100%)_1fr]",
          !chatWidth && "grid-cols-[1fr_min(56rem,100%)_1fr]",
        )}
      >
        <div className="col-start-2">
          <IntegrationTimelineEvent
            action={item.data.action}
            integrationName={item.data.integrationName}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      id={`message-group-${index}`}
      className={cn(
        "grid gap-4 px-4 py-2",
        chatWidth === "narrow" && "grid-cols-[1fr_min(42rem,100%)_1fr]",
        chatWidth === "standard" && "grid-cols-[1fr_min(56rem,100%)_1fr]",
        chatWidth === "wide" && "grid-cols-[1fr_min(72rem,100%)_1fr]",
        chatWidth === "full" && "grid-cols-[1fr_min(92%,100%)_1fr]",
        !chatWidth && "grid-cols-[1fr_min(56rem,100%)_1fr]",
      )}
    >
      {item.type === "message" ? (
        <div className="col-start-2">
          <ChatMessage
            message={item.data}
            nextMessage={getNextMessage()}
            isCollaborative={isCollaborative}
            senderUser={item.data.senderUser}
            conversation={conversation}
            showMessageStats={showMessageStats}
          />
        </div>
      ) : (
        <>
          <div className="col-start-2">
            <ChatMessage
              message={item.userMessage}
              isCollaborative={isCollaborative}
              senderUser={item.userMessage.senderUser}
              conversation={conversation}
              showMessageStats={showMessageStats}
            />
          </div>
          <div className="col-span-full pt-4">
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
  );
});

"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
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
import { ChatMessage } from "./ChatMessage";
import { ComparisonView } from "./ComparisonView";

const VIRTUALIZATION_THRESHOLD = 500;

type MessageWithUser = (Doc<"messages"> | OptimisticMessage) & {
  senderUser?: { name?: string; imageUrl?: string } | null;
};

interface VirtualizedMessageListProps {
  messages: MessageWithUser[];
  conversationId: Id<"conversations">;
  pinnedKey?: string;
  pinnedId?: string;
  pinnedSignature?: { createdAt: number; content: string };
  onVote?: (winnerId: string, rating: string) => void;
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
  pinnedKey,
  pinnedId,
  pinnedSignature,
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
  const lastPinnedAppliedRef = useRef<string | null>(null);
  const [pinFooterHeight, setPinFooterHeight] = useState(0);

  // Velocity-based scroll intent detection
  const { escapedFromBottom, enableAutoScroll } = useScrollIntent({
    scrollerRef,
  });

  const grouped = useMessageGrouping(messages ?? [], conversationId);
  const useVirtualization = grouped.length >= VIRTUALIZATION_THRESHOLD;
  const _reducedMotion = usePrefersReducedMotion();

  const pinnedIndex = useMemo(() => {
    if (grouped.length === 0) return -1;

    if (pinnedId) {
      const byId = grouped.findIndex((item) => {
        if (item.type === "message") return String(item.data._id) === pinnedId;
        return String(item.userMessage._id) === pinnedId;
      });
      if (byId !== -1) return byId;
    }

    if (!pinnedSignature) return -1;

    let best: { index: number; diff: number } | null = null;
    for (let i = 0; i < grouped.length; i++) {
      const item = grouped[i];
      const m = item.type === "message" ? item.data : item.userMessage;
      if (m.role !== "user") continue;
      if (m.content !== pinnedSignature.content) continue;
      const diff = Math.abs(m.createdAt - pinnedSignature.createdAt);
      if (diff > 10_000) continue;
      if (!best || diff < best.diff) best = { index: i, diff };
    }
    return best ? best.index : -1;
  }, [grouped, pinnedId, pinnedSignature]);

  const computePinFooter = useCallback(
    (container: HTMLElement, top: number) => {
      const maxScroll = container.scrollHeight - container.clientHeight;
      const needed = Math.max(0, Math.ceil(top - maxScroll));
      setPinFooterHeight((prev) => (prev === needed ? prev : needed));
      return needed;
    },
    [],
  );

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

  // Lift conversation query here to avoid N subscriptions in ChatMessage children
  const conversation = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
    api.conversations.get,
    conversationId ? { conversationId } : "skip",
  );

  // Lift preference here to avoid memo blocking updates in ChatMessage
  const showMessageStats = useUserPreference("showMessageStatistics");

  // Batch sync message metadata (attachments, toolCalls, sources) to local cache
  const messageIds = useMemo(
    () =>
      (messages ?? [])
        .filter((m) => !String(m._id).startsWith("temp-"))
        .map((m) => m._id as Id<"messages">),
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
      if (item.type === "message") {
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

  // Pin just-sent user message to top of viewport. Retry until group exists, apply once per id.
  useEffect(() => {
    const token = pinnedKey ?? pinnedId;
    if (!token) return;
    if (grouped.length === 0) return;
    if (pinnedIndex === -1) return;
    if (lastPinnedAppliedRef.current === token) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10;

    const tryScroll = () => {
      if (cancelled) return;
      if (lastPinnedAppliedRef.current === token) return;

      if (useVirtualization) {
        const virtuoso = virtuosoRef.current;
        if (!virtuoso) {
          if (attempts++ < maxAttempts) requestAnimationFrame(tryScroll);
          return;
        }

        const scroller = scrollerRef.current;
        if (pinFooterHeight === 0 && scroller) {
          setPinFooterHeight(scroller.clientHeight);
          if (attempts++ < maxAttempts) setTimeout(tryScroll, 0);
          return;
        }

        virtuoso.scrollToIndex({
          index: pinnedIndex,
          align: "start",
          behavior: "auto",
        });
        requestAnimationFrame(() => {
          virtuoso.scrollToIndex({
            index: pinnedIndex,
            align: "start",
            behavior: "auto",
          });
        });
        lastPinnedAppliedRef.current = token;
        return;
      }

      const element = document.getElementById(`message-group-${pinnedIndex}`);
      if (!element) {
        if (attempts++ < maxAttempts) requestAnimationFrame(tryScroll);
        return;
      }

      // Don't rely on scrollIntoView picking the right ancestor when we know the scroller.
      const container = scrollContainerRef.current;
      if (container) {
        const targetTop =
          element.offsetParent === container
            ? element.offsetTop
            : container.scrollTop +
              (element.getBoundingClientRect().top -
                container.getBoundingClientRect().top);

        const needed = computePinFooter(container, targetTop);
        container.scrollTop = targetTop;
        requestAnimationFrame(() => {
          container.scrollTop = targetTop;
        });

        if (Math.abs(container.scrollTop - targetTop) > 2) {
          if (needed > 0 && attempts++ < maxAttempts) {
            setTimeout(tryScroll, 50);
          }
          return;
        }
      } else {
        element.scrollIntoView({ behavior: "auto", block: "start" });
      }

      lastPinnedAppliedRef.current = token;
    };

    tryScroll();
    requestAnimationFrame(tryScroll);
    setTimeout(tryScroll, 50);

    return () => {
      cancelled = true;
    };
  }, [
    pinnedKey,
    pinnedId,
    pinnedIndex,
    grouped.length,
    useVirtualization,
    _reducedMotion,
    computePinFooter,
    pinFooterHeight,
  ]);

  // As content grows under the pinned item, reduce/remove footer once it's no longer needed.
  useEffect(() => {
    const token = pinnedKey ?? pinnedId;
    if (!token) return;
    if (pinnedIndex === -1) return;
    if (useVirtualization) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const element = document.getElementById(`message-group-${pinnedIndex}`);
    if (!element) return;

    const targetTop =
      element.offsetParent === container
        ? element.offsetTop
        : container.scrollTop +
          (element.getBoundingClientRect().top -
            container.getBoundingClientRect().top);
    computePinFooter(container, targetTop);
  }, [
    pinnedKey,
    pinnedId,
    pinnedIndex,
    grouped,
    useVirtualization,
    computePinFooter,
  ]);

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
                pinnedKey && pinnedIndex === index
                  ? pinnedKey
                  : item.type === "comparison"
                    ? item.id
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
          {pinFooterHeight > 0 && (
            <div
              aria-hidden="true"
              className="scroll-anchor-ignore"
              style={{ height: pinFooterHeight }}
            />
          )}
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
            aria-label="Scroll to bottom"
          >
            Scrolled up
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
        computeItemKey={(index, item) => {
          if (pinnedKey && pinnedIndex === index) return pinnedKey;
          return item.type === "comparison" ? item.id : item.data._id;
        }}
        components={{
          Footer: () =>
            pinFooterHeight > 0 ? (
              <div
                aria-hidden="true"
                className="scroll-anchor-ignore"
                style={{ height: pinFooterHeight }}
              />
            ) : null,
        }}
        defaultItemHeight={190}
        increaseViewportBy={{ top: 300, bottom: 300 }}
        initialTopMostItemIndex={grouped.length - 1}
        alignToBottom
        followOutput={false}
        atBottomStateChange={setAtBottom}
        atBottomThreshold={100}
        id="chat-messages"
        className="flex-1 w-full min-w-0 min-h-0"
        role="log"
        aria-live="polite"
        aria-busy={isGenerating}
        aria-label="Chat message history"
        itemContent={(index, item) => (
          <MessageItemContent
            key={item.type === "comparison" ? item.id : String(item.data._id)}
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
          aria-label="Scroll to bottom"
        >
          Scrolled up
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
  onVote?: (winnerId: string, rating: string) => void;
  onConsolidate?: (model: string, mode: "same-chat" | "new-chat") => void;
  onToggleModelNames?: () => void;
  conversation?: Doc<"conversations"> | null;
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
  const isMessage = item.type === "message";

  const getNextMessage = useCallback(() => {
    if (index + 1 >= grouped.length) return undefined;
    const nextItem = grouped[index + 1];
    return nextItem.type === "message" ? nextItem.data : undefined;
  }, [index, grouped]);

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
      {isMessage ? (
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

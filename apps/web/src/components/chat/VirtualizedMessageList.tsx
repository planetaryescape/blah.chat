"use client";

import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown } from "lucide-react";
import { memo, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useMetadataCacheSync } from "@/hooks/useCacheSync";
import { useConversationScroll } from "@/hooks/useConversationScroll";
import { useHighlightScroll } from "@/hooks/useHighlightScroll";
import {
  type GroupedItem,
  useMessageGrouping,
} from "@/hooks/useMessageGrouping";
import { cn } from "@/lib/utils";
import type { ChatWidth } from "@/lib/utils/chatWidth";
import type { OptimisticMessage } from "@/types/optimistic";
import { ChatMessage } from "./ChatMessage";
import { ComparisonView } from "./ComparisonView";

type MessageWithUser = (Doc<"messages"> | OptimisticMessage) & {
  senderUser?: { name?: string; imageUrl?: string } | null;
};

interface VirtualizedMessageListProps {
  messages: MessageWithUser[];
  onVote?: (winnerId: string, rating: string) => void;
  onConsolidate?: (model: string, mode: "same-chat" | "new-chat") => void;
  onToggleModelNames?: () => void;
  showModelNames: boolean;
  highlightMessageId?: string;
  chatWidth?: ChatWidth;
  isCollaborative?: boolean;
  onScrollReady?: (ready: boolean) => void;
}

export function VirtualizedMessageList({
  messages,
  onVote,
  onConsolidate,
  onToggleModelNames,
  showModelNames,
  chatWidth,
  highlightMessageId,
  isCollaborative,
  onScrollReady,
}: VirtualizedMessageListProps) {
  const { containerRef, scrollToBottom, showScrollButton } = useAutoScroll({
    threshold: 100,
  });

  const conversationId = messages?.[0]?.conversationId;
  const grouped = useMessageGrouping(messages ?? []);

  // Batch sync message metadata (attachments, toolCalls, sources) to local cache
  const messageIds = useMemo(
    () =>
      (messages ?? [])
        .filter((m) => !String(m._id).startsWith("temp-"))
        .map((m) => m._id as Id<"messages">),
    [messages],
  );
  useMetadataCacheSync(messageIds);

  const virtualizer = useVirtualizer({
    count: grouped.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 800, // Increased for long messages - reduces re-measurements
    overscan: 5, // Reduced - height reservations prevent layout shift
  });

  const virtualItems = virtualizer.getVirtualItems();

  useHighlightScroll({
    highlightMessageId,
    grouped,
    virtualizer,
  });
  useConversationScroll({
    conversationId,
    messageCount: messages?.length ?? 0,
    highlightMessageId,
    messages: messages ?? [],
    virtualizer,
    grouped,
    scrollContainer: containerRef,
    onScrollReady,
  });

  // VirtualizedMessageList should only render when there are messages
  // Empty state (including undefined/loading) is handled by parent component
  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <>
      <div
        ref={containerRef}
        role="log"
        aria-live="polite"
        aria-label="Chat message history"
        aria-atomic="false"
        className="flex-1 w-full min-w-0 min-h-0 overflow-y-auto relative"
        style={{ contain: "layout style paint" }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualItem) => (
            <VirtualizedItem
              key={virtualItem.key}
              virtualItem={virtualItem}
              grouped={grouped}
              chatWidth={chatWidth}
              isCollaborative={isCollaborative}
              showModelNames={showModelNames}
              onVote={onVote}
              onConsolidate={onConsolidate}
              onToggleModelNames={onToggleModelNames}
              measureElement={virtualizer.measureElement}
            />
          ))}
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
    </>
  );
}

// Memoized virtual item to prevent unnecessary re-renders
interface VirtualizedItemProps {
  virtualItem: { key: string | number | bigint; index: number; start: number };
  grouped: GroupedItem[];
  chatWidth?: ChatWidth;
  isCollaborative?: boolean;
  showModelNames: boolean;
  onVote?: (winnerId: string, rating: string) => void;
  onConsolidate?: (model: string, mode: "same-chat" | "new-chat") => void;
  onToggleModelNames?: () => void;
  measureElement: (node: Element | null) => void;
}

const VirtualizedItem = memo(function VirtualizedItem({
  virtualItem,
  grouped,
  chatWidth,
  isCollaborative,
  showModelNames,
  onVote,
  onConsolidate,
  onToggleModelNames,
  measureElement,
}: VirtualizedItemProps) {
  const item = grouped[virtualItem.index];
  const isMessage = item.type === "message";

  const getNextMessage = useCallback(() => {
    if (virtualItem.index + 1 >= grouped.length) return undefined;
    const nextItem = grouped[virtualItem.index + 1];
    return nextItem.type === "message" ? nextItem.data : undefined;
  }, [virtualItem.index, grouped]);

  return (
    <div
      data-index={virtualItem.index}
      ref={measureElement}
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
          "grid gap-4 px-4 py-2 transition-[grid-template-columns] duration-300 ease-out",
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
});

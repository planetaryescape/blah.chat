"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowDown } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMetadataCacheSync } from "@/hooks/useCacheSync";
import { useHighlightScroll } from "@/hooks/useHighlightScroll";
import {
  type GroupedItem,
  useMessageGrouping,
} from "@/hooks/useMessageGrouping";
import { useUserPreference } from "@/hooks/useUserPreference";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const lastConversationIdRef = useRef<string | undefined>(undefined);

  const conversationId = messages?.[0]?.conversationId;
  const grouped = useMessageGrouping(messages ?? [], conversationId);

  // Lift conversation query here to avoid N subscriptions in ChatMessage children
  const conversation =
    // @ts-expect-error - Type depth exceeded with complex Convex query (85+ modules)
    useQuery(
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

  // Scroll to bottom on conversation switch (only)
  useEffect(() => {
    if (conversationId !== lastConversationIdRef.current) {
      lastConversationIdRef.current = conversationId;
      // Scroll to bottom when switching conversations
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
        onScrollReady?.(true);
      });
    }
  }, [conversationId, onScrollReady]);

  // Track scroll position for "scroll to bottom" button
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setShowScrollButton(distanceFromBottom > 100);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle highlight scroll (for ?messageId= URL param)
  useHighlightScroll({
    highlightMessageId,
    grouped,
    virtualizer: containerRef.current
      ? {
          scrollToIndex: (
            index: number,
            options?: { align?: string; behavior?: string },
          ) => {
            const element = document.getElementById(`message-group-${index}`);
            if (element) {
              element.scrollIntoView({
                behavior: options?.behavior === "smooth" ? "smooth" : "auto",
                block: options?.align === "start" ? "start" : "end",
              });
            }
          },
        }
      : null,
  });

  const scrollToBottom = useCallback(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  // Empty state handled by parent
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
        className="flex-1 w-full min-w-0 min-h-0 overflow-y-auto"
      >
        <div className="flex flex-col">
          {grouped.map((item, index) => (
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
          ))}
        </div>
      </div>
      {showScrollButton && (
        <Button
          variant="outline"
          size="sm"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg transition-all duration-200 z-10 gap-1"
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          Scroll to bottom
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
  );
});

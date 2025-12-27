"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useConversationScroll } from "@/hooks/useConversationScroll";
import { useHighlightScroll } from "@/hooks/useHighlightScroll";
import { useMessageGrouping } from "@/hooks/useMessageGrouping";
import { useUserPreference } from "@/hooks/useUserPreference";
import { useConversations } from "@/lib/hooks/queries/useConversations";
import { cn } from "@/lib/utils";
import type { ChatWidth } from "@/lib/utils/chatWidth";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { ChatMessage } from "./ChatMessage";
import { ComparisonView } from "./ComparisonView";
import { EmptyScreen } from "./EmptyScreen";

type MessageWithUser = Doc<"messages"> & {
  senderUser?: { name?: string; imageUrl?: string } | null;
};

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
}: VirtualizedMessageListProps) {
  const { containerRef, scrollToBottom, showScrollButton } = useAutoScroll({
    threshold: 100,
    animationDuration: 400,
    disableAutoScroll: true,
  });

  const { data: conversationsData } = useConversations();
  const conversationCount =
    (conversationsData as { items?: unknown[] } | undefined)?.items?.length ??
    0;
  const customInstructions = useUserPreference("customInstructions");
  const nickname =
    (customInstructions as { nickname?: string } | undefined)?.nickname || "";

  const conversationId = messages[0]?.conversationId;
  const grouped = useMessageGrouping(messages);

  const virtualizer = useVirtualizer({
    count: grouped.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useHighlightScroll({
    highlightMessageId,
    grouped,
    containerRef,
    virtualizer,
  });
  useConversationScroll({
    containerRef,
    conversationId,
    messageCount: messages.length,
    highlightMessageId,
    messages,
  });

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full">
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
                    "grid gap-4 px-4 py-2 transition-all duration-300 ease-out",
                    chatWidth === "narrow" &&
                      "grid-cols-[1fr_min(42rem,100%)_1fr]",
                    chatWidth === "standard" &&
                      "grid-cols-[1fr_min(56rem,100%)_1fr]",
                    chatWidth === "wide" &&
                      "grid-cols-[1fr_min(72rem,100%)_1fr]",
                    chatWidth === "full" && "grid-cols-[1fr_min(92%,100%)_1fr]",
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

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Fragment, useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { ChatMessage } from "./ChatMessage";
import { ComparisonView } from "./ComparisonView";
import { EmptyScreen } from "./EmptyScreen";

type MessageWithUser = Doc<"messages"> & {
  senderUser?: { name?: string; imageUrl?: string } | null;
};

interface MessageListProps {
  messages: MessageWithUser[];
  selectedModel?: string;
  isGenerating?: boolean;
  onVote?: (winnerId: string, rating: string) => void;
  onConsolidate?: (model: string, mode: "same-chat" | "new-chat") => void;
  onToggleModelNames?: () => void;
  showModelNames: boolean;
  isCollaborative?: boolean;
}

export function MessageList({
  messages,
  selectedModel,
  isGenerating = false,
  onVote,
  onConsolidate,
  onToggleModelNames,
  showModelNames,
  isCollaborative,
}: MessageListProps) {
  const { containerRef, scrollToBottom, showScrollButton } = useAutoScroll({
    threshold: 100,
    animationDuration: 400,
    disableAutoScroll: true, // Never auto-scroll during streaming - user reads at own pace
  });

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

  // Note: Auto-scroll during streaming is handled by MutationObserver in useAutoScroll
  // No effect here - we don't want to scroll when isAtBottom changes (e.g., when generation completes)

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyScreen
          selectedModel={selectedModel}
          onClick={(val) => {
            // Ideally this would populate the input, but for now we essentially do nothing or could trigger a send via a prop if we refactor MessageList to support it.
            // Since MessageList doesn't control the input, we might need to lift this up or just let the user copy.
            // Wait, MessageList is used in ChatPage. Let's see how we can pass this up.
            // Actually, we can just dispatch a custom event or use a simple hack if we don't want to refactor everything right now.
            // Better yet, let's keep it robust. We should assume the parent handles it.
            // But MessageList props don't have onSuggestionClick.
            // For now, let's just make them copy-able or no-op until we update the interface?
            // No, the prompt requested improvements. I should update the interface.
            const event = new CustomEvent("insert-prompt", { detail: val });
            window.dispatchEvent(event);
          }}
        />
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
                  <ChatMessage
                    message={item.data}
                    nextMessage={nextMessage}
                    isCollaborative={isCollaborative}
                    senderUser={item.data.senderUser}
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
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  >
                    <ChatMessage
                      message={item.userMessage}
                      isCollaborative={isCollaborative}
                      senderUser={item.userMessage.senderUser}
                    />
                  </motion.div>
                  <motion.div
                    key={`comparison-${item.id}`}
                    layout
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
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

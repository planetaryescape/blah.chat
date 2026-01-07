"use client";

import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMemo, useRef } from "react";
import type { OptimisticMessage } from "@/types/optimistic";

type MessageWithUser = (Doc<"messages"> | OptimisticMessage) & {
  senderUser?: { name?: string; imageUrl?: string } | null;
};

export type GroupedItem =
  | { type: "message"; data: MessageWithUser }
  | {
      type: "comparison";
      id: string;
      userMessage: MessageWithUser;
      assistantMessages: MessageWithUser[];
      timestamp: number;
    };

/** Groups messages by comparisonGroupId, filtering out consolidated ones */
export function useMessageGrouping(messages: MessageWithUser[]): GroupedItem[] {
  const prevResultRef = useRef<GroupedItem[]>([]);

  const result = useMemo(() => {
    const visibleMessages = messages.filter(
      (m) => !(m.role === "assistant" && m.consolidatedMessageId),
    );

    const comparisonGroups: Record<string, MessageWithUser[]> = {};
    for (const msg of visibleMessages) {
      if (msg.comparisonGroupId) {
        comparisonGroups[msg.comparisonGroupId] ||= [];
        comparisonGroups[msg.comparisonGroupId].push(msg);
      }
    }

    const items: GroupedItem[] = [];
    const processedGroups = new Set<string>();

    for (const msg of visibleMessages) {
      if (msg.comparisonGroupId) {
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
          } else if (userMessage) {
            items.push({ type: "message", data: userMessage });
          }
          processedGroups.add(msg.comparisonGroupId);
        }
      } else {
        items.push({ type: "message", data: msg });
      }
    }

    return items;
  }, [messages]);

  // Keep previous data during brief empty states (prevents flash during pagination)
  if (result.length > 0) {
    prevResultRef.current = result;
    return result;
  }
  return prevResultRef.current;
}

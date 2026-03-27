"use client";

import { useMemo, useRef } from "react";
import type { OptimisticMessage } from "@/types/optimistic";

type MessageWithUser = (any | OptimisticMessage) & {
  senderUser?: { name?: string; imageUrl?: string } | null;
};

type IntegrationEventEntry = {
  _id: string;
  integrationId: string;
  integrationName: string;
  action: "enabled" | "disabled";
  createdAt: number;
  _creationTime: number;
};

function isIntegrationEventEntry(
  value: unknown,
): value is IntegrationEventEntry {
  return (
    !!value &&
    typeof value === "object" &&
    !("role" in value) &&
    "integrationId" in value &&
    "integrationName" in value &&
    "action" in value
  );
}

export type GroupedItem =
  | { type: "message"; data: MessageWithUser }
  | { type: "integration-event"; data: IntegrationEventEntry }
  | {
      type: "comparison";
      id: string;
      userMessage: MessageWithUser;
      assistantMessages: MessageWithUser[];
      timestamp: number;
    }
  | { type: "date-separator"; timestamp: number };

/** Groups messages by comparisonGroupId, filtering out consolidated ones */
export function useMessageGrouping(
  messages: Array<MessageWithUser | IntegrationEventEntry>,
  conversationId?: string | string,
): GroupedItem[] {
  const prevResultRef = useRef<GroupedItem[]>([]);
  const prevConversationIdRef = useRef<string | string | undefined>(undefined);

  const result = useMemo(() => {
    const visibleMessages = messages.filter(
      (m) =>
        isIntegrationEventEntry(m) ||
        !(m.role === "assistant" && m.consolidatedMessageId),
    );

    const comparisonGroups: Record<string, MessageWithUser[]> = {};
    for (const msg of visibleMessages) {
      if (isIntegrationEventEntry(msg)) {
        continue;
      }

      if (msg.comparisonGroupId) {
        comparisonGroups[msg.comparisonGroupId] ||= [];
        comparisonGroups[msg.comparisonGroupId].push(msg);
      }
    }

    const items: GroupedItem[] = [];
    const processedGroups = new Set<string>();
    let lastDay: string | null = null;

    for (const msg of visibleMessages) {
      if (isIntegrationEventEntry(msg)) {
        const day = new Date(msg.createdAt).toDateString();
        if (day !== lastDay) {
          items.push({ type: "date-separator", timestamp: msg.createdAt });
          lastDay = day;
        }
        items.push({ type: "integration-event", data: msg });
        continue;
      }

      // Determine the timestamp for this item
      const itemTimestamp = msg.comparisonGroupId
        ? Math.min(
            ...(comparisonGroups[msg.comparisonGroupId]?.map(
              (m) => m.createdAt,
            ) ?? [msg.createdAt]),
          )
        : msg.createdAt;

      // Insert date separator when calendar day changes
      const day = new Date(itemTimestamp).toDateString();
      if (day !== lastDay) {
        items.push({ type: "date-separator", timestamp: itemTimestamp });
        lastDay = day;
      }

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

  // Reset cache when conversation changes to prevent data leakage
  if (conversationId !== prevConversationIdRef.current) {
    prevConversationIdRef.current = conversationId;
    prevResultRef.current = []; // Clear cache, don't store potentially stale data
    return result;
  }

  // Keep previous data during brief empty states (prevents flash during pagination)
  // Only applies within the same conversation
  if (result.length > 0) {
    prevResultRef.current = result;
    return result;
  }
  return prevResultRef.current;
}

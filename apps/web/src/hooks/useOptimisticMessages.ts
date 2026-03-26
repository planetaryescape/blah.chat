"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OptimisticMessage } from "@/types/optimistic";

type ServerMessage = any;
export type MessageWithOptimistic = ServerMessage | OptimisticMessage;

interface UseOptimisticMessagesOptions {
  serverMessages: ServerMessage[] | undefined;
}

interface UseOptimisticMessagesReturn {
  messages: MessageWithOptimistic[] | undefined;
  addOptimisticMessages: (msgs: OptimisticMessage[]) => void;
}

/**
 * Time windows for matching optimistic user messages to server-confirmed ones.
 *
 * NOTE: Only USER messages are optimistic. Server creates assistant messages
 * synchronously (server-side) so no client-side optimistic assistant
 * messages exist.
 *
 * - MATCH_FUTURE_WINDOW_MS (10s): Allow server message to arrive after optimistic
 * - MATCH_PAST_WINDOW_MS (1s): Handle small clock skew
 */
const MATCH_FUTURE_WINDOW_MS = 10_000;
const MATCH_PAST_WINDOW_MS = 1_000;

function getPrimaryParentId(
  message: MessageWithOptimistic,
): string | undefined {
  if (
    "parentMessageIds" in message &&
    Array.isArray(message.parentMessageIds)
  ) {
    const parentId = message.parentMessageIds[0];
    if (parentId) return String(parentId);
  }
  if ("parentMessageId" in message && message.parentMessageId) {
    return String(message.parentMessageId);
  }
  return undefined;
}

function getClientMessageId(
  message: MessageWithOptimistic,
): string | undefined {
  if (!("clientMessageId" in message)) return undefined;
  return typeof message.clientMessageId === "string" &&
    message.clientMessageId.length > 0
    ? message.clientMessageId
    : undefined;
}

interface ServerMessageWithOrder {
  message: ServerMessage;
  index: number;
  parentId: string | undefined;
}

function toServerMessageWithOrder(
  message: ServerMessage,
  index: number,
): ServerMessageWithOrder {
  return {
    message,
    index,
    parentId: getPrimaryParentId(message),
  };
}

function getSiblingIndex(message: ServerMessage): number {
  return typeof message.siblingIndex === "number" ? message.siblingIndex : 0;
}

function compareDirectParentRelationship(
  a: ServerMessageWithOrder,
  b: ServerMessageWithOrder,
): number {
  const aId = String(a.message._id);
  const bId = String(b.message._id);
  if (a.parentId === bId) return 1;
  if (b.parentId === aId) return -1;
  return 0;
}

function compareRolesWithinParent(
  a: ServerMessageWithOrder,
  b: ServerMessageWithOrder,
): number {
  if (a.parentId !== b.parentId) return 0;
  if (a.message.role === b.message.role) return 0;
  if (a.message.role === "user" && b.message.role === "assistant") return -1;
  if (a.message.role === "assistant" && b.message.role === "user") return 1;
  return 0;
}

function compareSiblingIndexWithinParent(
  a: ServerMessageWithOrder,
  b: ServerMessageWithOrder,
): number {
  if (a.parentId !== b.parentId) return 0;
  const aSiblingIndex = getSiblingIndex(a.message);
  const bSiblingIndex = getSiblingIndex(b.message);
  if (aSiblingIndex === bSiblingIndex) return 0;
  return aSiblingIndex - bSiblingIndex;
}

function compareServerEntries(
  a: ServerMessageWithOrder,
  b: ServerMessageWithOrder,
): number {
  const parentOrder = compareDirectParentRelationship(a, b);
  if (parentOrder !== 0) return parentOrder;

  const roleOrder = compareRolesWithinParent(a, b);
  if (roleOrder !== 0) return roleOrder;

  const siblingOrder = compareSiblingIndexWithinParent(a, b);
  if (siblingOrder !== 0) return siblingOrder;

  return a.index - b.index;
}

/**
 * Preserve server ordering as source of truth while enforcing tree constraints:
 * 1) parent before child
 * 2) user before assistant for same parent cluster
 * 3) siblingIndex when available
 * 4) original server order fallback
 */
function stabilizeServerOrder(
  serverMessages: ServerMessage[],
): ServerMessage[] {
  const withOrder = serverMessages.map(toServerMessageWithOrder);
  withOrder.sort(compareServerEntries);

  return withOrder.map((entry) => entry.message);
}

function findBestOptimisticMatchIndex(
  serverMessage: ServerMessage,
  optimisticMessages: OptimisticMessage[],
): number {
  const clientMessageId = getClientMessageId(serverMessage);
  if (clientMessageId) {
    const exactClientMatch = optimisticMessages.findIndex(
      (opt) =>
        opt.role === "user" &&
        typeof opt.clientMessageId === "string" &&
        opt.clientMessageId === clientMessageId,
    );
    if (exactClientMatch !== -1) {
      return exactClientMatch;
    }
  }

  let bestMatchIndex = -1;
  let bestAbsDiff = Number.POSITIVE_INFINITY;
  for (let i = 0; i < optimisticMessages.length; i++) {
    const optimistic = optimisticMessages[i];
    if (optimistic.role !== "user") continue;

    const timeDiff = serverMessage.createdAt - optimistic.createdAt;
    if (timeDiff < -MATCH_PAST_WINDOW_MS || timeDiff > MATCH_FUTURE_WINDOW_MS) {
      continue;
    }

    const absDiff = Math.abs(timeDiff);
    if (absDiff < bestAbsDiff) {
      bestAbsDiff = absDiff;
      bestMatchIndex = i;
    }
  }

  return bestMatchIndex;
}

function mergeWithOptimisticMessages(
  serverMessages: ServerMessage[],
  optimisticMessages: OptimisticMessage[],
): MessageWithOptimistic[] {
  const orderedServerMessages = stabilizeServerOrder(serverMessages);

  if (optimisticMessages.length === 0) {
    return orderedServerMessages;
  }

  const remainingOptimistic = [...optimisticMessages];
  for (const serverMessage of orderedServerMessages) {
    if (serverMessage.role !== "user") {
      continue;
    }

    const matchIndex = findBestOptimisticMatchIndex(
      serverMessage,
      remainingOptimistic,
    );
    if (matchIndex !== -1) {
      remainingOptimistic.splice(matchIndex, 1);
    }
  }

  return [...orderedServerMessages, ...remainingOptimistic];
}

/**
 * Manages optimistic UI for messages - overlay local optimistic messages
 * on top of server state with deduplication when server confirms.
 *
 * Handles undefined serverMessages (loading state) by returning undefined
 * to distinguish from empty array (no messages).
 */
export function useOptimisticMessages({
  serverMessages,
}: UseOptimisticMessagesOptions): UseOptimisticMessagesReturn {
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticMessage[]
  >([]);

  // Track conversation ID to clear optimistic messages on conversation switch
  const conversationIdRef = useRef<string | undefined>(undefined);
  const currentConversationId = serverMessages?.[0]?.conversationId;

  // Clear optimistic messages when conversation changes
  // This handles all transitions:
  // - Conversation A → B (clear A's optimistic messages)
  // - Conversation A → undefined/loading (clear A's optimistic messages)
  // - undefined → Conversation A (keep empty, no messages to clear)
  useEffect(() => {
    if (
      conversationIdRef.current &&
      conversationIdRef.current !== currentConversationId
    ) {
      setOptimisticMessages([]);
    }
    conversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  // Callback for ChatInput to add optimistic messages (instant, before API call)
  const addOptimisticMessages = useCallback(
    (newMessages: OptimisticMessage[]) => {
      setOptimisticMessages((prev) => [...prev, ...newMessages]);
    },
    [],
  );

  // Keep previous data during brief undefined states (prevents flash during pagination)
  const prevMessagesRef = useRef<MessageWithOptimistic[] | undefined>(
    undefined,
  );
  const prevConversationIdRef = useRef<string | undefined>(undefined);

  // Merge server messages with optimistic messages, deduplicating confirmed ones
  const messages = useMemo<MessageWithOptimistic[] | undefined>(() => {
    // If server messages are undefined (loading), only return cached if same conversation
    if (serverMessages === undefined) {
      if (
        prevConversationIdRef.current &&
        prevConversationIdRef.current === currentConversationId
      ) {
        return prevMessagesRef.current ?? undefined;
      }
      return undefined;
    }

    const merged = mergeWithOptimisticMessages(
      serverMessages,
      optimisticMessages,
    );
    prevMessagesRef.current = merged;
    prevConversationIdRef.current = currentConversationId;
    return merged;
  }, [serverMessages, optimisticMessages, currentConversationId]);

  // NOTE: We intentionally don't clean up optimistic messages from state
  // The useMemo already filters them out visually when server confirms.
  // Keeping them in state avoids the re-render that causes flash.
  // They'll be cleared naturally on next message send or page navigation.

  return {
    messages,
    addOptimisticMessages,
  };
}

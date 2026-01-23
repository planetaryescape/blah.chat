"use client";

import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OptimisticMessage } from "@/types/optimistic";

type ServerMessage = Doc<"messages">;
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
 * synchronously (convex/chat.ts:188-205) so no client-side optimistic assistant
 * messages exist.
 *
 * - MATCH_FUTURE_WINDOW_MS (10s): Allow server message to arrive after optimistic
 * - MATCH_PAST_WINDOW_MS (1s): Handle small clock skew
 */
const MATCH_FUTURE_WINDOW_MS = 10_000;
const MATCH_PAST_WINDOW_MS = 1_000;

function mergeWithOptimisticMessages(
  serverMessages: MessageWithOptimistic[],
  optimisticMessages: OptimisticMessage[],
): MessageWithOptimistic[] {
  if (optimisticMessages.length === 0) return serverMessages;

  // Group server messages by role for matching (only user messages are optimistic)
  const serverByRole: Record<"user" | "assistant", MessageWithOptimistic[]> = {
    user: serverMessages.filter((m) => m.role === "user"),
    assistant: [], // Not used - assistant messages come from server only
  };

  // Sort for deterministic matching
  serverByRole.user.sort((a, b) => a.createdAt - b.createdAt);

  const remainingOptimistic: OptimisticMessage[] = [];
  const sortedOptimistic = [...optimisticMessages].sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  for (const opt of sortedOptimistic) {
    // Only user messages are optimistic (server creates assistant messages)
    const candidates = serverByRole[opt.role] || [];
    const matchIndex = candidates.findIndex((serverMsg) => {
      // Time window check - match if server message arrived within window
      const timeDiff = serverMsg.createdAt - opt.createdAt;
      return (
        timeDiff >= -MATCH_PAST_WINDOW_MS && timeDiff <= MATCH_FUTURE_WINDOW_MS
      );
    });

    if (matchIndex === -1) {
      remainingOptimistic.push(opt);
      continue;
    }

    // Consume matched server message so it can't be reused for another optimistic entry
    candidates.splice(matchIndex, 1);
  }

  return [...serverMessages, ...remainingOptimistic].sort(
    (a, b) => a.createdAt - b.createdAt,
  );
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
      serverMessages as MessageWithOptimistic[],
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

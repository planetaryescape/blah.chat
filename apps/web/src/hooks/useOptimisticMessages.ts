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

  // Merge server messages with optimistic messages, deduplicating confirmed ones
  const messages = useMemo<MessageWithOptimistic[] | undefined>(() => {
    // If server messages are undefined (loading), return undefined
    if (serverMessages === undefined) {
      return undefined;
    }

    const server = serverMessages as MessageWithOptimistic[];

    if (optimisticMessages.length === 0) {
      return server;
    }

    // Filter out optimistic messages that have been confirmed by server
    // Match by role + timestamp within 5s window (handles slow networks)
    // For assistant messages, also match by model (prevents comparison mode collisions)
    const pendingOptimistic = optimisticMessages.filter((opt) => {
      const hasServerVersion = server.some((m) => {
        // Basic check: role and timestamp within 5s
        if (m.role !== opt.role) return false;
        if (Math.abs(m.createdAt - opt.createdAt) >= 5000) return false;

        // For assistant messages, also check model (comparison mode dedup)
        if (opt.role === "assistant" && opt.model && m.model !== opt.model) {
          return false;
        }

        return true;
      });
      return !hasServerVersion;
    });

    // Merge and sort chronologically
    return [...server, ...pendingOptimistic].sort(
      (a, b) => a.createdAt - b.createdAt,
    );
  }, [serverMessages, optimisticMessages]);

  // NOTE: We intentionally don't clean up optimistic messages from state
  // The useMemo already filters them out visually when server confirms.
  // Keeping them in state avoids the re-render that causes flash.
  // They'll be cleared naturally on next message send or page navigation.

  return {
    messages,
    addOptimisticMessages,
  };
}

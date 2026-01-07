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
 * Time windows used when matching optimistic messages to server-confirmed ones
 * using createdAt timestamps (see timeDiff check below).
 *
 * - MATCH_FUTURE_WINDOW_MS:
 *   We allow a server message to be created up to this much *after* the
 *   optimistic message timestamp and still be considered the same logical
 *   message. This primarily covers Convex action scheduling / delivery
 *   delays that we've observed can be several seconds in the worst case;
 *   10s is a conservative upper bound to avoid spurious duplicates while
 *   still eventually reconciling most delayed messages.
 *
 * - MATCH_PAST_WINDOW_MS:
 *   We allow the server message to be created slightly *before* the
 *   optimistic timestamp. This is only to handle small clock skew and
  *   client / server time rounding differences. Keeping this to 1s
 *   minimizes the risk of accidentally matching legitimately older
 *   messages in the history, which would incorrectly hide them.
 *
 * When the absolute time difference falls outside both windows
 * (i.e. timeDiff < -MATCH_PAST_WINDOW_MS or timeDiff > MATCH_FUTURE_WINDOW_MS),
 * we do **not** match the server message to the optimistic one. In that case
 * the optimistic message is left in place, and the server message is treated
 * as a separate entry. This means that:
 *   - Excessive scheduler delays beyond 10s can manifest as temporary
 *     duplicates (optimistic + server copy).
 *   - Significant clock skew in distributed deployments (>> 1s) can prevent
 *     matching and likewise produce duplicates rather than hiding real data.
 */
const MATCH_FUTURE_WINDOW_MS = 10_000;
const MATCH_PAST_WINDOW_MS = 1_000;

function mergeWithOptimisticMessages(
  serverMessages: MessageWithOptimistic[],
  optimisticMessages: OptimisticMessage[],
): MessageWithOptimistic[] {
  if (optimisticMessages.length === 0) return serverMessages;

  // Copy server messages by role so we can consume matches without mutating the original array
  const serverByRole: Record<"user" | "assistant", MessageWithOptimistic[]> = {
    user: [],
    assistant: [],
  };

  for (const msg of serverMessages) {
    if (msg.role === "user" || msg.role === "assistant") {
      serverByRole[msg.role].push(msg);
    }
  }

  // Ensure deterministic matching order
  serverByRole.user.sort((a, b) => a.createdAt - b.createdAt);
  serverByRole.assistant.sort((a, b) => a.createdAt - b.createdAt);

  const remainingOptimistic: OptimisticMessage[] = [];
  const sortedOptimistic = [...optimisticMessages].sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  for (const opt of sortedOptimistic) {
    const candidates = serverByRole[opt.role] || [];
    const matchIndex = candidates.findIndex((serverMsg) => {
      // Assistant messages: prioritize model matching (timing-independent)
      // Fixes dual-loader bug caused by clock skew or action scheduler delay
      if (opt.role === "assistant") {
        // If both have models, match by model (most reliable)
        if (opt.model && serverMsg.model) {
          return opt.model === serverMsg.model;
        }
        // Fallback to timestamp if no model info
      }

      // User messages (and assistant fallback): use timestamp matching
      const timeDiff = serverMsg.createdAt - opt.createdAt;

      // Only match messages created slightly before (clock skew) or after the optimistic one
      if (
        timeDiff < -MATCH_PAST_WINDOW_MS ||
        timeDiff > MATCH_FUTURE_WINDOW_MS
      ) {
        return false;
      }

      return true;
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

  // Merge server messages with optimistic messages, deduplicating confirmed ones
  const messages = useMemo<MessageWithOptimistic[] | undefined>(() => {
    // If server messages are undefined (loading), keep previous data
    if (serverMessages === undefined) {
      return prevMessagesRef.current ?? undefined;
    }

    const merged = mergeWithOptimisticMessages(
      serverMessages as MessageWithOptimistic[],
      optimisticMessages,
    );
    prevMessagesRef.current = merged;
    return merged;
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

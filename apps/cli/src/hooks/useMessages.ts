/**
 * useMessages hook - Subscribe to conversation messages
 *
 * Real-time subscription that auto-updates when messages change.
 * Replaces polling pattern in ChatView.
 */

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import type { Message } from "../lib/queries.js";
import { useConvexSubscription } from "./useConvexSubscription.js";

/**
 * Subscribe to messages in a conversation.
 *
 * @param conversationId - The conversation to subscribe to
 * @returns { data: messages, error, isLoading }
 *
 * @example
 * const { data: messages, isLoading } = useMessages(conversationId);
 * const isGenerating = messages?.some(m => m.status === "generating");
 */
export function useMessages(conversationId: Id<"conversations">) {
  return useConvexSubscription<Message[] | null>(api.cliAuth.listMessages, {
    conversationId,
  });
}

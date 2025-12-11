"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { analytics } from "@/lib/analytics";
import { useEmptyConversationReuse } from "./useEmptyConversationReuse";
import { useNewChatModel } from "./useNewChatModel";

/**
 * Unified new chat creation hook with empty conversation reuse
 *
 * Used by all new chat entry points:
 * - Sidebar "New Chat" button
 * - Header "New Chat" button
 * - Keyboard shortcut (Cmd+Shift+O)
 * - Command palette
 * - /app page dispatcher
 *
 * Behavior:
 * 1. Checks for reusable empty conversation
 * 2. If found, navigates to it (analytics: conversation_reused)
 * 3. Otherwise, creates new conversation (analytics: conversation_started)
 * 4. Navigates to the conversation
 */
export function useNewChat() {
  const router = useRouter();
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const createConversation = useMutation(api.conversations.create);
  const { newChatModel } = useNewChatModel();
  const { findEmptyConversation, isLoading } = useEmptyConversationReuse();

  const startNewChat = useCallback(async (): Promise<Id<"conversations">> => {
    // Check for reusable empty conversation
    const empty = findEmptyConversation();

    if (empty) {
      // Reuse existing empty conversation
      router.push(`/chat/${empty._id}`);
      analytics.track("conversation_reused", { conversationId: empty._id });
      return empty._id;
    }

    // Create new conversation with user's preferred model
    const conversationId = await createConversation({
      model: newChatModel,
      title: "New Chat",
    });

    router.push(`/chat/${conversationId}`);
    analytics.track("conversation_started", { model: newChatModel });
    return conversationId;
  }, [findEmptyConversation, createConversation, newChatModel, router]);

  return {
    startNewChat,
    isLoading,
  };
}

"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { analytics } from "@/lib/analytics";
import { useApiClient } from "@/lib/api/client";
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
  const apiClient = useApiClient();
  const { newChatModel } = useNewChatModel();
  const { findEmptyConversation, isLoading } = useEmptyConversationReuse();

  const startNewChat = useCallback(async (): Promise<string> => {
    // Check for reusable empty conversation
    const empty = findEmptyConversation();

    if (empty) {
      await apiClient.patch(`/api/v1/conversations/${empty._id}`, {
        ...(empty.model !== newChatModel ? { model: newChatModel } : {}),
        selectedIntegrationIds: [],
      });
      router.push(`/chat/${empty._id}`);
      analytics.track("conversation_reused", { conversationId: empty._id });
      return empty._id;
    }

    // Create new conversation with user's preferred model
    const conversation = await apiClient.post<{ _id: string }>(
      "/api/v1/conversations",
      {
        model: newChatModel,
        title: "New Chat",
      },
    );

    const conversationId = conversation._id;

    router.push(`/chat/${conversationId}`);
    analytics.track("conversation_started", { model: newChatModel });
    return conversationId;
  }, [apiClient, findEmptyConversation, newChatModel, router]);

  return {
    startNewChat,
    isLoading,
  };
}

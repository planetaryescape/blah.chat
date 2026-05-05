"use client";

import { useEffect, useState } from "react";

export interface ConversationResource {
  _id: string;
  title: string;
  model: string;
  mode?: string | null;
  thinkingEffort?: "none" | "low" | "medium" | "high" | null;
  isCollaborative?: boolean;
  selectedIntegrationIds?: string[];
  modelRecommendation?: {
    suggestedModelId: string;
    currentModelId: string;
    estimatedSavings: { percentSaved: number };
    reasoning: string;
    dismissed: boolean;
    createdAt: number;
  };
  archived?: boolean;
  messageCount?: number;
  lastMessageAt?: number;
  createdAt: number;
  updatedAt: number;
}

export function useConversationResource(conversationId?: string | null) {
  const [conversation, setConversation] = useState<
    ConversationResource | null | undefined
  >(undefined);

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      return;
    }

    let cancelled = false;
    setConversation(undefined);

    void fetch(`/api/v1/conversations/${conversationId}`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`Failed to fetch conversation: ${response.status}`);
        }
        const payload = await response.json();
        return (payload?.data ?? null) as ConversationResource | null;
      })
      .then((data) => {
        if (!cancelled) {
          setConversation(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConversation(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  return conversation;
}

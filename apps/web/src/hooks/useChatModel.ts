"use client";

import type { ModelConfig } from "@blah-chat/ai/models";
import { DEFAULT_MODEL_ID } from "@blah-chat/ai/operational-models";
import { isValidModel } from "@blah-chat/ai/utils";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "@/lib/api/client";
import { useUserPreference } from "./useUserPreference";

interface UseChatModelOptions {
  conversationId: string | undefined;
  /** Models record from database (optional - for validation) */
  models?: Record<string, ModelConfig>;
}

export function useChatModel({ conversationId, models }: UseChatModelOptions) {
  const apiClient = useApiClient();
  const { data: conversation } = useQuery({
    queryKey: ["chat-model", conversationId],
    queryFn: async () =>
      conversationId
        ? apiClient.get<{ model?: string }>(
            `/api/v1/conversations/${conversationId}`,
          )
        : null,
    enabled: Boolean(conversationId),
    staleTime: 30_000,
  });
  const userDefaultModel = useUserPreference("defaultModel");

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    // Initialize with conversation model if valid, else user preference if valid, else default
    const conversationModel = conversation?.model;

    if (conversationModel && isValidModel(conversationModel, models)) {
      return conversationModel;
    }
    if (userDefaultModel && isValidModel(userDefaultModel, models)) {
      return userDefaultModel;
    }
    return DEFAULT_MODEL_ID;
  });

  // Update local model state when conversation or user data loads
  useEffect(() => {
    // Prioritize conversation model if it's valid
    if (conversation?.model && isValidModel(conversation.model, models)) {
      setSelectedModel(conversation.model);
      return;
    }

    // Fall back to user's default if it's valid
    if (userDefaultModel && isValidModel(userDefaultModel, models)) {
      setSelectedModel(userDefaultModel);
      return;
    }

    // Ultimate fallback to system default
    setSelectedModel(DEFAULT_MODEL_ID);
  }, [conversation?.model, userDefaultModel, models]);

  const handleModelChange = useCallback(
    async (modelId: string) => {
      // Optimistic update
      setSelectedModel(modelId);

      // Persist to DB if conversation exists
      if (conversationId) {
        try {
          await apiClient.patch(`/api/v1/conversations/${conversationId}`, {
            model: modelId,
          });
        } catch (error) {
          console.error("Failed to persist model:", error);
          // UI already updated, user expects change to stick
        }
      }
      // New conversations: model saved when first message sent (chat.ts:75)
    },
    [apiClient, conversationId],
  );

  return {
    selectedModel,
    setSelectedModel,
    handleModelChange,
    conversation,
    user: undefined,
  };
}

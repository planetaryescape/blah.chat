"use client";

import type { ModelConfig } from "@blah-chat/ai/models";
import { DEFAULT_MODEL_ID } from "@blah-chat/ai/operational-models";
import { getModelConfig, isValidModel } from "@blah-chat/ai/utils";
import { useCallback, useMemo, useState } from "react";
import { useApiClient } from "@/lib/api/client";
import { DEFAULT_CONTEXT_WINDOW } from "@/lib/utils/formatMetrics";

interface UseChatModelSelectionOptions {
  conversationId: string | undefined;
  conversation: any | null | undefined;
  user: any | null | undefined;
  defaultModel: string | undefined;
  /** Token usage for context limit checking */
  tokenUsage?: { totalTokens: number } | null;
  /** Callback when model switch is blocked due to context exceeding target model's limit */
  onModelBlocked?: (targetModelId: string, targetContextWindow: number) => void;
  /** Models record from database (optional - will use useModels hook if not provided) */
  models?: Record<string, ModelConfig>;
}

interface UseChatModelSelectionReturn {
  selectedModel: string;
  displayModel: string;
  modelLoading: boolean;
  optimisticModel: string | null;
  handleModelChange: (modelId: string) => Promise<void>;
}

/**
 * Manages model selection for a chat conversation.
 *
 * Priority order:
 * 1. Conversation model (if valid)
 * 2. User's default model (if valid)
 * 3. System default model
 *
 * Includes optimistic updates during model changes.
 */
export function useChatModelSelection({
  conversationId,
  conversation,
  user,
  defaultModel,
  tokenUsage,
  onModelBlocked,
  models,
}: UseChatModelSelectionOptions): UseChatModelSelectionReturn {
  const apiClient = useApiClient();

  // Separate state for optimistic updates during model changes
  const [optimisticModel, setOptimisticModel] = useState<string | null>(null);

  // Calculate final model selection based on priority logic
  // Only show the model once both conversation and user data are loaded
  const { selectedModel, modelLoading } = useMemo(() => {
    // Show loading until we have definitive answers about both conversation and user
    const conversationLoaded = conversation !== undefined; // null = not found, undefined = loading
    const userLoaded = user !== undefined;

    if (!conversationLoaded || !userLoaded) {
      return { selectedModel: "", modelLoading: true };
    }

    // Now we can determine the final model without flickering
    let finalModel = DEFAULT_MODEL_ID;

    // Priority 1: Conversation model (if valid)
    if (conversation?.model && isValidModel(conversation.model, models)) {
      finalModel = conversation.model;
    }
    // Priority 2: User's default model (if valid)
    else if (defaultModel && isValidModel(defaultModel, models)) {
      finalModel = defaultModel;
    }
    // Priority 3: System default (always valid)
    else {
      finalModel = DEFAULT_MODEL_ID;
    }

    return { selectedModel: finalModel, modelLoading: false };
  }, [conversation, user, defaultModel, models]);

  // The actual model to display - prefers optimistic updates over stable state
  const displayModel = optimisticModel || selectedModel;

  const handleModelChange = useCallback(
    async (modelId: string) => {
      // Check if context would exceed target model's limit
      if (tokenUsage && onModelBlocked) {
        const targetConfig = getModelConfig(modelId, models);
        const targetContextWindow =
          targetConfig?.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
        if (tokenUsage.totalTokens > targetContextWindow) {
          onModelBlocked(modelId, targetContextWindow);
          return; // Block the switch
        }
      }

      // Optimistic update - shows immediately while persisting
      setOptimisticModel(modelId);

      // Persist to DB if conversation exists
      if (conversationId) {
        try {
          await apiClient.patch(`/api/v1/conversations/${conversationId}`, {
            model: modelId,
          });
          // Clear optimistic state after successful persist
          setOptimisticModel(null);
        } catch (error) {
          console.error("Failed to persist model:", error);
          // Revert optimistic update on failure
          setOptimisticModel(null);
        }
      }
      // New conversations: model saved when first message sent (chat.ts:75)
    },
    [apiClient, conversationId, tokenUsage, onModelBlocked, models],
  );

  return {
    selectedModel,
    displayModel,
    modelLoading,
    optimisticModel,
    handleModelChange,
  };
}

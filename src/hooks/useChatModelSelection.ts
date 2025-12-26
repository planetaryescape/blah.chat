"use client";

import { useMutation } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { DEFAULT_MODEL_ID } from "@/lib/ai/operational-models";
import { isValidModel } from "@/lib/ai/utils";

interface UseChatModelSelectionOptions {
  conversationId: Id<"conversations">;
  conversation: Doc<"conversations"> | null | undefined;
  user: Doc<"users"> | null | undefined;
  defaultModel: string | undefined;
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
}: UseChatModelSelectionOptions): UseChatModelSelectionReturn {
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateModelMutation = useMutation(api.conversations.updateModel);

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
    if (conversation?.model && isValidModel(conversation.model)) {
      finalModel = conversation.model;
    }
    // Priority 2: User's default model (if valid)
    else if (defaultModel && isValidModel(defaultModel)) {
      finalModel = defaultModel;
    }
    // Priority 3: System default (always valid)
    else {
      finalModel = DEFAULT_MODEL_ID;
    }

    return { selectedModel: finalModel, modelLoading: false };
  }, [conversation, user, defaultModel]);

  // The actual model to display - prefers optimistic updates over stable state
  const displayModel = optimisticModel || selectedModel;

  const handleModelChange = useCallback(
    async (modelId: string) => {
      // Optimistic update - shows immediately while persisting
      setOptimisticModel(modelId);

      // Persist to DB if conversation exists
      if (conversationId) {
        try {
          await updateModelMutation({
            conversationId,
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
    [conversationId, updateModelMutation],
  );

  return {
    selectedModel,
    displayModel,
    modelLoading,
    optimisticModel,
    handleModelChange,
  };
}

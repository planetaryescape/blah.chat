"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DEFAULT_MODEL_ID } from "@/lib/ai/operational-models";
import { isValidModel } from "@/lib/ai/utils";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";

interface UseChatModelOptions {
  conversationId: Id<"conversations"> | undefined;
}

export function useChatModel({ conversationId }: UseChatModelOptions) {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const conversation = useQuery(
    api.conversations.get,
    conversationId ? { conversationId } : "skip"
  );
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    // Initialize with conversation model if valid, else user preference if valid, else default
    const conversationModel = conversation?.model;
    const userDefaultModel = user?.preferences?.defaultModel;

    if (conversationModel && isValidModel(conversationModel)) {
      return conversationModel;
    }
    if (userDefaultModel && isValidModel(userDefaultModel)) {
      return userDefaultModel;
    }
    return DEFAULT_MODEL_ID;
  });

  // Update local model state when conversation or user data loads
  useEffect(() => {
    // Prioritize conversation model if it's valid
    if (conversation?.model && isValidModel(conversation.model)) {
      setSelectedModel(conversation.model);
      return;
    }

    // Fall back to user's default if it's valid
    if (
      user?.preferences?.defaultModel &&
      isValidModel(user.preferences.defaultModel)
    ) {
      setSelectedModel(user.preferences.defaultModel);
      return;
    }

    // Ultimate fallback to system default
    setSelectedModel(DEFAULT_MODEL_ID);
  }, [conversation?.model, user?.preferences?.defaultModel]);

  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateModelMutation = useMutation(api.conversations.updateModel);

  const handleModelChange = useCallback(
    async (modelId: string) => {
      // Optimistic update
      setSelectedModel(modelId);

      // Persist to DB if conversation exists
      if (conversationId) {
        try {
          await updateModelMutation({
            conversationId,
            model: modelId,
          });
        } catch (error) {
          console.error("Failed to persist model:", error);
          // UI already updated, user expects change to stick
        }
      }
      // New conversations: model saved when first message sent (chat.ts:75)
    },
    [conversationId, updateModelMutation]
  );

  return {
    selectedModel,
    setSelectedModel,
    handleModelChange,
    conversation,
    user,
  };
}

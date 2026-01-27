"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import type { ModelConfig } from "@/lib/ai/models";
import { DEFAULT_MODEL_ID } from "@/lib/ai/operational-models";
import { isValidModel } from "@/lib/ai/utils";
import { useUserPreference } from "./useUserPreference";

interface UseChatModelOptions {
  conversationId: Id<"conversations"> | undefined;
  /** Models record from database (optional - for validation) */
  models?: Record<string, ModelConfig>;
}

export function useChatModel({ conversationId, models }: UseChatModelOptions) {
  const conversation = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
    api.conversations.get,
    conversationId ? { conversationId } : "skip",
  );
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);
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
    [conversationId, updateModelMutation],
  );

  return {
    selectedModel,
    setSelectedModel,
    handleModelChange,
    conversation,
    user,
  };
}

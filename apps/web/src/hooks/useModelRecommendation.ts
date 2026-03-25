import { useCallback, useEffect, useState } from "react";
import { useSDKClient } from "@/lib/api/sdkClient";
import type { OptimisticMessage } from "@/types/optimistic";

interface ConversationLike {
  model?: string | null;
}

interface MessageLike {
  role: string;
  status?: string;
  _creationTime?: number;
  createdAt?: number;
}

type Message = MessageLike | OptimisticMessage;

interface UseModelRecommendationOptions {
  conversation: ConversationLike | null | undefined;
  messages: Message[] | undefined;
  onModelChange: (modelId: string) => Promise<void>;
}

export function useModelRecommendation({
  conversation,
  messages,
  onModelChange,
}: UseModelRecommendationOptions) {
  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewModelId, setPreviewModelId] = useState<string | null>(null);

  // Set-as-default prompt state
  const [showSetDefaultPrompt, setShowSetDefaultPrompt] = useState(false);
  const [switchedModelId, setSwitchedModelId] = useState<string | null>(null);
  const [switchedModelAt, setSwitchedModelAt] = useState<number | null>(null);

  const sdk = useSDKClient();

  // Switch to recommended model
  const handleSwitchModel = useCallback(
    async (modelId: string) => {
      await onModelChange(modelId);
      setSwitchedModelId(modelId);
      setSwitchedModelAt(Date.now());
    },
    [onModelChange],
  );

  // Open preview modal for a model
  const handlePreviewModel = useCallback((modelId: string) => {
    setPreviewModelId(modelId);
    setPreviewModalOpen(true);
  }, []);

  // Set switched model as user's default
  const handleSetAsDefault = useCallback(async () => {
    if (!switchedModelId) return;

    await sdk.updatePreference("defaultModel", switchedModelId);

    setShowSetDefaultPrompt(false);
  }, [switchedModelId, sdk]);

  // Show set-as-default prompt after first successful generation with switched model
  useEffect(() => {
    if (switchedModelId && switchedModelAt && messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      // Check if last message was generated with switched model and completed
      if (
        lastMessage.role === "assistant" &&
        lastMessage.status === "complete" &&
        conversation?.model === switchedModelId &&
        (lastMessage as MessageLike).createdAt &&
        ((lastMessage as MessageLike).createdAt ?? 0) > switchedModelAt
      ) {
        // Show prompt after a brief delay (2 seconds)
        const timer = setTimeout(() => {
          setShowSetDefaultPrompt(true);
        }, 2000);

        return () => clearTimeout(timer);
      }
    }
  }, [messages, switchedModelId, switchedModelAt, conversation?.model]);

  // Listen for model preview events (from recommendation banner)
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ modelId: string }>;
      setPreviewModelId(customEvent.detail.modelId);
      setPreviewModalOpen(true);
    };
    window.addEventListener("open-model-preview", handler);
    return () => window.removeEventListener("open-model-preview", handler);
  }, []);

  return {
    // Preview modal
    previewModalOpen,
    setPreviewModalOpen,
    previewModelId,

    // Set-as-default prompt
    showSetDefaultPrompt,
    switchedModelId,

    // Handlers
    handleSwitchModel,
    handlePreviewModel,
    handleSetAsDefault,
    dismissSetDefaultPrompt: () => setShowSetDefaultPrompt(false),
  };
}

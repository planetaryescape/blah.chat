import { useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import type { OptimisticMessage } from "@/types/optimistic";

type Message = Doc<"messages"> | OptimisticMessage;

interface UseModelRecommendationOptions {
  conversation: Doc<"conversations"> | null | undefined;
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

  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updatePreferences = useMutation(api.users.updatePreferences);

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

    await updatePreferences({
      preferences: {
        defaultModel: switchedModelId,
      },
    });

    setShowSetDefaultPrompt(false);
  }, [switchedModelId, updatePreferences]);

  // Show set-as-default prompt after first successful generation with switched model
  useEffect(() => {
    if (switchedModelId && switchedModelAt && messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      // Check if last message was generated with switched model and completed
      if (
        lastMessage.role === "assistant" &&
        lastMessage.status === "complete" &&
        conversation?.model === switchedModelId &&
        lastMessage._creationTime > switchedModelAt
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

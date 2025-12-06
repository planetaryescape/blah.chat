"use client";

import { ChatInput } from "@/components/chat/ChatInput";
import { ContextWindowIndicator } from "@/components/chat/ContextWindowIndicator";
import { ExtractMemoriesButton } from "@/components/chat/ExtractMemoriesButton";
import { VirtualizedMessageList } from "@/components/chat/VirtualizedMessageList";
import { ShareDialog } from "@/components/chat/ShareDialog";
import { type ThinkingEffort } from "@/components/chat/ThinkingEffortSelector";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { getModelConfig } from "@/lib/ai/models";
import { useComparisonMode } from "@/hooks/useComparisonMode";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

export default function ChatPage({
  params,
}: {
  params: Promise<{ conversationId: Id<"conversations"> }>;
}) {
  const unwrappedParams = use(params);
  const conversationId = unwrappedParams.conversationId;
  const router = useRouter();

  const conversation = useQuery(
    // @ts-ignore - Convex type inference depth issue with conditional skip
    api.conversations.get,
    conversationId ? { conversationId } : "skip",
  );
  const messages = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip",
  );
  const user = useQuery(api.users.getCurrentUser);

  const [selectedModel, setSelectedModel] = useState<string>(
    conversation?.model || user?.preferences.defaultModel || "openai:gpt-5.1",
  );
  const [thinkingEffort, setThinkingEffort] =
    useState<ThinkingEffort>("medium");
  const [attachments, setAttachments] = useState<
    Array<{
      type: "file" | "image" | "audio";
      name: string;
      storageId: string;
      mimeType: string;
      size: number;
    }>
  >([]);
  const [showModelNamesOverride, setShowModelNamesOverride] = useState<
    boolean | null
  >(null);

  const { isActive, selectedModels, startComparison, exitComparison } =
    useComparisonMode();

  const recordVote = useMutation(api.votes.recordVote);
  const createConsolidation = useMutation(
    api.conversations.createConsolidationConversation,
  );

  const handleVote = async (winnerId: string, rating: string) => {
    const msg = messages?.find((m: Doc<"messages">) => m._id === winnerId);
    if (msg?.comparisonGroupId) {
      const voteRating = rating as
        | "left_better"
        | "right_better"
        | "tie"
        | "both_bad";
      await recordVote({
        comparisonGroupId: msg.comparisonGroupId,
        winnerId: msg._id,
        rating: voteRating,
      });
    }
  };

  const handleConsolidate = async (model: string) => {
    const msg = messages?.find((m: Doc<"messages">) => m.comparisonGroupId);
    if (msg?.comparisonGroupId) {
      const { conversationId: newConvId } = await createConsolidation({
        comparisonGroupId: msg.comparisonGroupId,
        consolidationModel: model,
      });
      router.push(`/chat/${newConvId}`);
    }
  };

  // Compute effective showModelNames (local override takes precedence)
  const showModelNames =
    showModelNamesOverride ??
    user?.preferences?.showModelNamesDuringComparison ??
    false;

  const handleToggleModelNames = () => {
    setShowModelNamesOverride((prev) => {
      const current =
        prev ?? user?.preferences?.showModelNamesDuringComparison ?? false;
      return !current;
    });
  };

  // Sync with conversation model on load
  useEffect(() => {
    if (conversation?.model) {
      setSelectedModel(conversation.model);
    }
  }, [conversation?.model]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "m") {
        e.preventDefault();
        document
          .querySelector("[data-model-selector]")
          ?.dispatchEvent(new Event("click", { bubbles: true }));
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  // Redirect if conversation not found
  useEffect(() => {
    if (conversation === null) {
      router.push("/app");
    }
  }, [conversation, router]);

  if (!conversationId || conversation === undefined || messages === undefined) {
    return (
      <div className="flex items-center justify-center h-full">Loading...</div>
    );
  }

  if (conversation === null) {
    return null;
  }

  const isGenerating = messages.some(
    (m: Doc<"messages">) =>
      m.role === "assistant" &&
      ["pending", "generating"].includes(m.status || ""),
  );

  const modelConfig = getModelConfig(selectedModel);
  const showThinkingEffort = modelConfig?.supportsThinkingEffort;
  const hasMessages = messages.length > 0;
  const messageCount = conversation?.messageCount || 0;

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      <header className="flex items-center gap-4 px-4 py-3 border-b shrink-0">
        <h1 className="text-lg font-semibold truncate flex-1">
          {conversation.title || "New Chat"}
        </h1>

        <div className="flex items-center gap-2">
          {messageCount >= 3 && (
            <ExtractMemoriesButton conversationId={conversationId} />
          )}
          {hasMessages && (
            <ContextWindowIndicator conversationId={conversationId} />
          )}
          {hasMessages && <ShareDialog conversationId={conversationId} />}
        </div>
      </header>

      <VirtualizedMessageList
        messages={messages}
        onVote={handleVote}
        onConsolidate={handleConsolidate}
        onToggleModelNames={handleToggleModelNames}
        showModelNames={showModelNames}
      />

      <ChatInput
        conversationId={conversationId}
        isGenerating={isGenerating}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        thinkingEffort={showThinkingEffort ? thinkingEffort : undefined}
        onThinkingEffortChange={setThinkingEffort}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        isComparisonMode={isActive}
        selectedModels={selectedModels}
        onStartComparison={startComparison}
        onExitComparison={exitComparison}
      />
    </div>
  );
}

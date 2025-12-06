"use client";

import { ChatInput } from "@/components/chat/ChatInput";
import { ContextWindowIndicator } from "@/components/chat/ContextWindowIndicator";
import { ExtractMemoriesButton } from "@/components/chat/ExtractMemoriesButton";
import { ShareDialog } from "@/components/chat/ShareDialog";
import { VirtualizedMessageList } from "@/components/chat/VirtualizedMessageList";
import { type ThinkingEffort } from "@/components/chat/ThinkingEffortSelector";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useConversationContext } from "@/contexts/ConversationContext";
import { useComparisonMode } from "@/hooks/useComparisonMode";
import { getModelConfig } from "@/lib/ai/models";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";

export default function ChatPage({
  params,
}: {
  params: Promise<{ conversationId: Id<"conversations"> }>;
}) {
  const unwrappedParams = use(params);
  const conversationId = unwrappedParams.conversationId;
  const router = useRouter();
  const { filteredConversations } = useConversationContext();

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
  const consolidateInPlace = useMutation(
    api.conversations.consolidateInSameChat,
  );
  const updateModelMutation = useMutation(api.conversations.updateModel);

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

  const handleConsolidate = async (
    model: string,
    mode: "same-chat" | "new-chat",
  ) => {
    const msg = messages?.find((m: Doc<"messages">) => m.comparisonGroupId);
    if (!msg?.comparisonGroupId) return;

    if (mode === "same-chat") {
      // Consolidate in place - no navigation
      await consolidateInPlace({
        conversationId: conversationId!,
        comparisonGroupId: msg.comparisonGroupId,
        consolidationModel: model,
      });

      // Update conversation model to match consolidation choice
      await updateModelMutation({
        conversationId: conversationId!,
        model: model,
      });
    } else {
      // Create new conversation and navigate
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

  // Navigation helpers
  const { currentIndex, isFirst, isLast } = useMemo(() => {
    if (!filteredConversations?.length || !conversationId) {
      return { currentIndex: -1, isFirst: true, isLast: true };
    }

    const sorted = [...filteredConversations].sort(
      (a, b) => b._creationTime - a._creationTime,
    );
    const idx = sorted.findIndex((c) => c._id === conversationId);

    return {
      currentIndex: idx,
      isFirst: idx <= 0,
      isLast: idx >= sorted.length - 1,
    };
  }, [filteredConversations, conversationId]);

  const navigateToPrevious = () => {
    if (isFirst || !filteredConversations?.length) return;

    const sorted = [...filteredConversations].sort(
      (a, b) => b._creationTime - a._creationTime,
    );
    const prevIdx = Math.max(currentIndex - 1, 0);
    router.push(`/chat/${sorted[prevIdx]._id}`);
  };

  const navigateToNext = () => {
    if (isLast || !filteredConversations?.length) return;

    const sorted = [...filteredConversations].sort(
      (a, b) => b._creationTime - a._creationTime,
    );
    const nextIdx = Math.min(currentIndex + 1, sorted.length - 1);
    router.push(`/chat/${sorted[nextIdx]._id}`);
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      <header className="flex items-center gap-4 px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={navigateToPrevious}
                  disabled={isFirst}
                  className="h-7 w-7 shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous conversation (⌘[)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <h1 className="text-lg font-semibold truncate">
            {conversation.title || "New Chat"}
          </h1>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={navigateToNext}
                  disabled={isLast}
                  className="h-7 w-7 shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next conversation (⌘])</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

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
        isEmpty={messages?.length === 0}
      />
    </div>
  );
}

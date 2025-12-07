"use client";

import { ChatInput } from "@/components/chat/ChatInput";
import { ContextWindowIndicator } from "@/components/chat/ContextWindowIndicator";
import { ExtractMemoriesButton } from "@/components/chat/ExtractMemoriesButton";
import { ModelBadge } from "@/components/chat/ModelBadge";
import { ModelFeatureHint } from "@/components/chat/ModelFeatureHint";
import { QuickModelSwitcher } from "@/components/chat/QuickModelSwitcher";
import { ShareDialog } from "@/components/chat/ShareDialog";
import { ConversationHeaderMenu } from "@/components/chat/ConversationHeaderMenu";
import { VirtualizedMessageList } from "@/components/chat/VirtualizedMessageList";
import { ProgressiveHints } from "@/components/ui/ProgressiveHints";
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
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { getModelConfig } from "@/lib/ai/models";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { useCallback } from "react";
import { useQueryState, parseAsBoolean } from "nuqs";

export default function ChatPage({
  params,
}: {
  params: Promise<{ conversationId: Id<"conversations"> }>;
}) {
  const unwrappedParams = use(params);
  const conversationId = unwrappedParams.conversationId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightMessageId = searchParams.get("messageId") || undefined;
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

  // URL state for comparison view toggles
  const [showModelNames, setShowModelNames] = useQueryState(
    "showModelNames",
    parseAsBoolean.withDefault(
      user?.preferences?.showModelNamesDuringComparison ?? false,
    ),
  );
  const [syncScroll, setSyncScroll] = useQueryState(
    "syncScroll",
    parseAsBoolean.withDefault(true),
  );

  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);

  const { isActive, selectedModels, startComparison, exitComparison } =
    useComparisonMode();
  const { isMobile, isTouchDevice } = useMobileDetect();

  const recordVote = useMutation(api.votes.recordVote);
  const createConsolidation = useMutation(
    api.conversations.createConsolidationConversation,
  );
  const consolidateInPlace = useMutation(
    api.conversations.consolidateInSameChat,
  );
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

  // Sync with conversation model on load
  useEffect(() => {
    if (conversation?.model) {
      setSelectedModel(conversation.model);
    }
  }, [conversation?.model]);

  // Quick model switcher keyboard shortcut (⌘J)
  useEffect(() => {
    const handler = () => setQuickSwitcherOpen(true);
    window.addEventListener("open-quick-model-switcher", handler);
    return () =>
      window.removeEventListener("open-quick-model-switcher", handler);
  }, []);

  // Redirect if conversation not found
  useEffect(() => {
    if (conversation === null) {
      router.push("/app");
    }
  }, [conversation, router]);

  // Autofocus input when navigating to conversation
  useEffect(() => {
    if (!conversationId || isMobile || isTouchDevice) return;

    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("focus-chat-input"));
    }, 50);

    return () => clearTimeout(timer);
  }, [conversationId, isMobile, isTouchDevice]);

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
  const showThinkingEffort = !!modelConfig?.reasoning;
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

        <ModelBadge
          modelId={isActive ? undefined : selectedModel}
          isComparison={isActive}
          comparisonCount={selectedModels.length}
          onClick={() => {
            if (isActive) {
              setComparisonDialogOpen(true);
            } else {
              setModelSelectorOpen(true);
            }
          }}
        />

        <div className="flex items-center gap-2">
          {messageCount >= 3 && (
            <ExtractMemoriesButton conversationId={conversationId} />
          )}
          {hasMessages && (
            <ContextWindowIndicator conversationId={conversationId} />
          )}
          {hasMessages && <ShareDialog conversationId={conversationId} />}
          <ConversationHeaderMenu conversation={conversation} />
        </div>
      </header>

      <VirtualizedMessageList
        messages={messages}
        selectedModel={selectedModel}
        onVote={handleVote}
        onConsolidate={handleConsolidate}
        onToggleModelNames={() => setShowModelNames(!showModelNames)}
        showModelNames={showModelNames ?? false}
        syncScroll={syncScroll ?? true}
        highlightMessageId={highlightMessageId}
      />

      <div className="relative px-4 pb-4">
        {!isActive && <ModelFeatureHint modelId={selectedModel} />}
        <ProgressiveHints
          messageCount={messages?.length ?? 0}
          conversationCount={filteredConversations?.length ?? 0}
        />
        <ChatInput
          conversationId={conversationId}
          isGenerating={isGenerating}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          thinkingEffort={showThinkingEffort ? thinkingEffort : undefined}
          onThinkingEffortChange={setThinkingEffort}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          isComparisonMode={isActive}
          selectedModels={selectedModels}
          onStartComparison={startComparison}
          onExitComparison={exitComparison}
          isEmpty={messages?.length === 0}
          modelSelectorOpen={modelSelectorOpen}
          onModelSelectorOpenChange={setModelSelectorOpen}
          comparisonDialogOpen={comparisonDialogOpen}
          onComparisonDialogOpenChange={setComparisonDialogOpen}
        />
      </div>

      <QuickModelSwitcher
        open={quickSwitcherOpen}
        onOpenChange={setQuickSwitcherOpen}
        currentModel={selectedModel}
        onSelectModel={handleModelChange}
      />
    </div>
  );
}

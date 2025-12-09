"use client";

import { BranchBadge } from "@/components/chat/BranchBadge";
import { ChatInput } from "@/components/chat/ChatInput";
import { ContextWindowIndicator } from "@/components/chat/ContextWindowIndicator";
import { ConversationHeaderMenu } from "@/components/chat/ConversationHeaderMenu";
import { ExtractMemoriesButton } from "@/components/chat/ExtractMemoriesButton";
import { MessageListSkeleton } from "@/components/chat/MessageListSkeleton";
import { ModelBadge } from "@/components/chat/ModelBadge";
import { ModelFeatureHint } from "@/components/chat/ModelFeatureHint";
import { QuickModelSwitcher } from "@/components/chat/QuickModelSwitcher";
import { ShareDialog } from "@/components/chat/ShareDialog";
import type { ThinkingEffort } from "@/components/chat/ThinkingEffortSelector";
import { TTSPlayerBar } from "@/components/chat/TTSPlayerBar";
import { VirtualizedMessageList } from "@/components/chat/VirtualizedMessageList";
import { ProjectSelector } from "@/components/projects/ProjectSelector";
import { Button } from "@/components/ui/button";
import { ProgressiveHints } from "@/components/ui/ProgressiveHints";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConversationContext } from "@/contexts/ConversationContext";
import { TTSProvider } from "@/contexts/TTSContext";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useComparisonMode } from "@/hooks/useComparisonMode";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { getModelConfig } from "@/lib/ai/utils";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";
import { Suspense, use, useCallback, useEffect, useMemo, useState } from "react";

function ChatPageContent({
  params,
}: {
  params: Promise<{ conversationId: Id<"conversations"> }>;
}) {
  const unwrappedParams = use(params);
  const conversationId = unwrappedParams.conversationId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightMessageId = searchParams.get("messageId") ?? undefined;

  const { filteredConversations } = useConversationContext();

  const conversation = useQuery(
    // @ts-ignore - Type instantiation is excessively deep and possibly infinite
    api.conversations.get,
    conversationId ? { conversationId } : "skip",
  );
  const messages = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip",
  );
  const user = useQuery(api.users.getCurrentUser);

  const [selectedModel, setSelectedModel] = useState<string>(
    conversation?.model || user?.preferences.defaultModel || "openai:gpt-5",
  );

  // Update local model state when conversation loads
  useEffect(() => {
    if (conversation?.model) {
      setSelectedModel(conversation.model);
    } else if (user?.preferences.defaultModel) {
      // Fallback to user preference if conversation is loading or doesn't specify
      // Only if we haven't set a model yet (checking against default)
      if (selectedModel === "openai:gpt-5") {
        setSelectedModel(user.preferences.defaultModel);
      }
    }
  }, [conversation?.model, user?.preferences.defaultModel]);

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

  // Quick model switcher keyboard shortcut (⌘J)
  useEffect(() => {
    const handler = () => setQuickSwitcherOpen(true);
    window.addEventListener("open-quick-model-switcher", handler);
    return () =>
      window.removeEventListener("open-quick-model-switcher", handler);
  }, []);

  // Redirect if conversation is confirmed to be null (deleted/invalid)
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

  // Derived state that handles loading gracefully
  const isGenerating =
    messages?.some(
      (m: Doc<"messages">) =>
        m.role === "assistant" &&
        ["pending", "generating"].includes(m.status || ""),
    ) ?? false;

  const modelConfig = getModelConfig(selectedModel);
  const showThinkingEffort = !!modelConfig?.reasoning;
  const hasMessages = (messages?.length ?? 0) > 0;
  // If conversation is loading, default to 0 count
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
    <TTSProvider defaultSpeed={user?.preferences?.ttsSpeed ?? 1}>
      <div className="relative flex h-[100dvh] flex-col overflow-hidden">
        <header className="flex items-center gap-4 border-b px-4 py-3 shrink-0">
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
              {conversation?.title || "New Chat"}
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

          <ProjectSelector
            conversationId={conversationId}
            currentProjectId={conversation?.projectId ?? undefined}
          />

          <div className="flex items-center gap-2">
            {conversationId && messageCount >= 3 && (
              <ExtractMemoriesButton conversationId={conversationId} />
            )}
            {hasMessages && conversationId && (
              <ContextWindowIndicator conversationId={conversationId} />
            )}
            {conversationId && <BranchBadge conversationId={conversationId} />}
            {hasMessages && conversationId && (
              <ShareDialog conversationId={conversationId} />
            )}
            {conversation && (
              <ConversationHeaderMenu conversation={conversation} />
            )}
          </div>
        </header>

        <TTSPlayerBar />

        {messages === undefined ? (
          <MessageListSkeleton />
        ) : (
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
        )}

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
    </TTSProvider>
  );
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ conversationId: Id<"conversations"> }>;
}) {
  return (
    <Suspense fallback={<MessageListSkeleton />}>
      <ChatPageContent params={params} />
    </Suspense>
  );
}

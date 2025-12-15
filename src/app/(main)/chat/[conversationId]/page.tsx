"use client";

import { BranchBadge } from "@/components/chat/BranchBadge";
import { ChatInput } from "@/components/chat/ChatInput";
import { ContextWindowIndicator } from "@/components/chat/ContextWindowIndicator";
import { ConversationHeaderMenu } from "@/components/chat/ConversationHeaderMenu";
import { ExtractMemoriesButton } from "@/components/chat/ExtractMemoriesButton";
import { MessageListSkeleton } from "@/components/chat/MessageListSkeleton";
import { ModelBadge } from "@/components/chat/ModelBadge";
import { ModelPreviewModal } from "@/components/chat/ModelPreviewModal";
import { ModelRecommendationBanner } from "@/components/chat/ModelRecommendationBanner";
import { QuickModelSwitcher } from "@/components/chat/QuickModelSwitcher";
import { SetDefaultModelPrompt } from "@/components/chat/SetDefaultModelPrompt";
import { ShareDialog } from "@/components/chat/ShareDialog";
import type { ThinkingEffort } from "@/components/chat/ThinkingEffortSelector";
import { TTSPlayerBar } from "@/components/chat/TTSPlayerBar";
import { VirtualizedMessageList } from "@/components/chat/VirtualizedMessageList";
import { ProjectSelector } from "@/components/projects/ProjectSelector";
import { QuickTemplateSwitcher } from "@/components/templates/QuickTemplateSwitcher";
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
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { useUserPreference } from "@/hooks/useUserPreference";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { DEFAULT_MODEL_ID } from "@/lib/ai/operational-models";
import { getModelConfig, isValidModel } from "@/lib/ai/utils";
import type { ChatWidth } from "@/lib/utils/chatWidth";
import type { OptimisticMessage } from "@/types/optimistic";
import { usePaginatedQuery, useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";
import {
    Suspense,
    use,
    useCallback,
    useEffect,
    useMemo,
    useOptimistic,
    useRef,
    useState,
} from "react";

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

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const conversation = useQuery(
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    api.conversations.get,
    conversationId ? { conversationId } : "skip",
  );
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const {
    results: serverMessages,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.messages.listPaginated,
    conversationId ? { conversationId } : "skip",
    {
      initialNumItems: 50,
    },
  );
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);

  // Optimistic UI: Overlay local optimistic messages on top of server state
  // Deduplicates when server confirms (match by role + timestamp ±2s window)
  // Type: Union of server messages and optimistic messages for useOptimistic compatibility
  type ServerMessage = NonNullable<typeof serverMessages>[number];
  type MessageWithOptimistic = ServerMessage | OptimisticMessage;

  const [messages, addOptimisticMessages] = useOptimistic<
    MessageWithOptimistic[],
    OptimisticMessage[]
  >(
    (serverMessages || []) as MessageWithOptimistic[],
    (state, newMessages) => {
      // Merge optimistic messages with server state
      const merged = [...state, ...newMessages];

      // Deduplicate: Remove optimistic if server version exists
      // Match by role + timestamp within 2s window (handles network delays)
      const deduped = merged.filter((msg, _idx, arr) => {
        if (!("_optimistic" in msg) || !msg._optimistic) {
          return true; // Keep all server messages
        }

        // Check if server has confirmed this optimistic message
        const hasServerVersion = arr.some(
          (m) =>
            !("_optimistic" in m) &&
            m.role === msg.role &&
            Math.abs(m.createdAt - msg.createdAt) < 2000,
        );

        return !hasServerVersion; // Remove optimistic if server confirmed
      });

      // Sort by timestamp (chronological order)
      return deduped.sort((a, b) => a.createdAt - b.createdAt);
    },
  );

  // Extract chat width preference (Phase 4: use flat preference hook)
  const prefChatWidth = useUserPreference("chatWidth");
  const chatWidth = (prefChatWidth as ChatWidth | undefined) || "standard";

  // Feature toggles for conditional UI elements
  const features = useFeatureToggles();

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
  const [syncScroll, _setSyncScroll] = useQueryState(
    "syncScroll",
    parseAsBoolean.withDefault(true),
  );

  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  // Ref for infinite scroll at top of message list
  const messageListTopRef = useRef<HTMLDivElement | null>(null);

  // Model recommendation state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewModelId, setPreviewModelId] = useState<string | null>(null);
  const [showSetDefaultPrompt, setShowSetDefaultPrompt] = useState(false);
  const [switchedModelId, setSwitchedModelId] = useState<string | null>(null);
  const [switchedModelAt, setSwitchedModelAt] = useState<number | null>(null);

  const { isActive, selectedModels, startComparison, exitComparison } =
    useComparisonMode();
  const { isMobile, isTouchDevice } = useMobileDetect();

  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const recordVote = useMutation(api.votes.recordVote);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const createConsolidation = useMutation(
    api.conversations.createConsolidationConversation,
  );
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const consolidateInPlace = useMutation(
    api.conversations.consolidateInSameChat,
  );
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateModelMutation = useMutation(api.conversations.updateModel);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updatePreferences = useMutation(api.users.updatePreferences);

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
    // Only handle votes for server-confirmed messages (not optimistic)
    const msg = messages?.find(
      (m) => !('_optimistic' in m) && m._id === winnerId,
    );
    if (msg?.comparisonGroupId) {
      const voteRating = rating as
        | "left_better"
        | "right_better"
        | "tie"
        | "both_bad";
      await recordVote({
        comparisonGroupId: msg.comparisonGroupId,
        winnerId: msg._id as Id<"messages">,
        rating: voteRating,
      });
    }
  };

  const handleConsolidate = async (
    model: string,
    mode: "same-chat" | "new-chat",
  ) => {
    const msg = messages?.find((m) => m.comparisonGroupId);
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

  // Model recommendation handlers
  const handleSwitchModel = useCallback(
    async (modelId: string) => {
      // Update conversation model
      await handleModelChange(modelId);

      // Store for set-as-default prompt with timestamp
      setSwitchedModelId(modelId);
      setSwitchedModelAt(Date.now());
    },
    [handleModelChange],
  );

  const handlePreviewModel = useCallback((modelId: string) => {
    setPreviewModelId(modelId);
    setPreviewModalOpen(true);
  }, []);

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

  // Quick model switcher keyboard shortcut (⌘J)
  useEffect(() => {
    const handler = () => setQuickSwitcherOpen(true);
    window.addEventListener("open-quick-model-switcher", handler);
    return () =>
      window.removeEventListener("open-quick-model-switcher", handler);
  }, []);

  // Quick template switcher keyboard shortcut (⌘;)
  useEffect(() => {
    const handler = () => setTemplateSelectorOpen(true);
    window.addEventListener("open-quick-template-switcher", handler);
    return () =>
      window.removeEventListener("open-quick-template-switcher", handler);
  }, []);

  // Handle template insertion from sessionStorage (after navigation from templates page)
  useEffect(() => {
    const insertTemplate = searchParams.get("insertTemplate");
    if (insertTemplate !== "true") return;

    // Read template text from sessionStorage
    const templateText = sessionStorage.getItem("pending-template-text");
    if (templateText) {
      // Clear sessionStorage
      sessionStorage.removeItem("pending-template-text");

      // Dispatch insert-prompt event after a brief delay to ensure ChatInput is mounted
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("insert-prompt", { detail: templateText })
        );
        window.dispatchEvent(new CustomEvent("focus-chat-input"));
      }, 100);
    }

    // Clean up URL param
    const url = new URL(window.location.href);
    url.searchParams.delete("insertTemplate");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [searchParams, router]);

  // Model preview modal (from recommendation banner)
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ modelId: string }>;
      setPreviewModelId(customEvent.detail.modelId);
      setPreviewModalOpen(true);
    };
    window.addEventListener("open-model-preview", handler);
    return () => window.removeEventListener("open-model-preview", handler);
  }, []);

  // Infinite scroll for loading more messages (at top of list)
  useEffect(() => {
    if (!messageListTopRef.current || paginationStatus !== "CanLoadMore") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && paginationStatus === "CanLoadMore") {
          loadMore(50);
        }
      },
      { threshold: 1.0 },
    );

    observer.observe(messageListTopRef.current);

    return () => observer.disconnect();
  }, [paginationStatus, loadMore]);

  // Redirect if conversation is confirmed to be null (deleted/invalid)
  // Track if we've completed initial load to prevent premature redirects
  const initialLoadComplete = useRef(false);

  useEffect(() => {
    // Wait for query to finish loading (undefined = loading, null = not found)
    if (conversation === undefined) {
      initialLoadComplete.current = false;
      return;
    }

    // Mark initial load complete
    initialLoadComplete.current = true;

    // Only redirect if truly null (deleted/invalid conversation)
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
      (m) =>
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

          {features.showProjects && (
            <ProjectSelector
              conversationId={conversationId}
              currentProjectId={conversation?.projectId ?? undefined}
            />
          )}

          <div className="flex items-center gap-2">
            {conversationId && messageCount >= 3 && (
              <ExtractMemoriesButton conversationId={conversationId} />
            )}
            {hasMessages && conversationId && (
              <ContextWindowIndicator conversationId={conversationId} modelId={selectedModel} />
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

        {serverMessages === undefined || paginationStatus === "LoadingFirstPage" ? (
          <MessageListSkeleton chatWidth={chatWidth} />
        ) : (
          <>
            {/* Load More Button (fallback for top of list) */}
            {paginationStatus === "CanLoadMore" && (
              <div className="flex justify-center p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadMore(50)}
                  className="text-sm"
                >
                  Load older messages
                </Button>
              </div>
            )}
            {paginationStatus === "LoadingMore" && (
              <div className="flex justify-center p-4">
                <div className="text-sm text-muted-foreground">
                  Loading more messages...
                </div>
              </div>
            )}

            {/* Invisible div for intersection observer */}
            <div ref={messageListTopRef} className="h-px" />

            <VirtualizedMessageList
              messages={messages as Doc<"messages">[]}
              selectedModel={selectedModel}
              chatWidth={chatWidth}
              onVote={handleVote}
              onConsolidate={handleConsolidate}
              onToggleModelNames={() => setShowModelNames(!showModelNames)}
              showModelNames={showModelNames ?? false}
              syncScroll={syncScroll ?? true}
              highlightMessageId={highlightMessageId}
            />
          </>
        )}

        <div className="relative px-4 pb-4">
          <ProgressiveHints
            messageCount={messages?.length ?? 0}
            conversationCount={filteredConversations?.length ?? 0}
          />

          {/* Model Recommendation Banner */}
          {conversation?.modelRecommendation &&
            !conversation.modelRecommendation.dismissed && (
              <ModelRecommendationBanner
                recommendation={conversation.modelRecommendation}
                conversationId={conversationId}
                onSwitch={handleSwitchModel}
                onPreview={handlePreviewModel}
              />
            )}

          {/* Set Default Model Prompt (shows after successful generation) */}
          {showSetDefaultPrompt && switchedModelId && (
            <SetDefaultModelPrompt
              modelId={switchedModelId}
              modelName={MODEL_CONFIG[switchedModelId]?.name ?? switchedModelId}
              conversationId={conversationId}
              onSetDefault={handleSetAsDefault}
              onDismiss={() => setShowSetDefaultPrompt(false)}
            />
          )}

          <ChatInput
            conversationId={conversationId}
            chatWidth={chatWidth}
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
            onOptimisticUpdate={addOptimisticMessages}
          />
        </div>

        {/* Preview Modal */}
        {previewModalOpen &&
          previewModelId &&
          conversation?.modelRecommendation && (
            <ModelPreviewModal
              open={previewModalOpen}
              onOpenChange={setPreviewModalOpen}
              currentModelId={conversation.modelRecommendation.currentModelId}
              suggestedModelId={previewModelId}
              currentResponse={
                messages?.find((m) => m.role === "assistant")?.content ?? ""
              }
              onSwitch={handleSwitchModel}
              conversationId={conversationId}
              userMessage={
                messages?.find((m) => m.role === "user")?.content ?? ""
              }
            />
          )}

        <QuickModelSwitcher
          open={quickSwitcherOpen}
          onOpenChange={setQuickSwitcherOpen}
          currentModel={selectedModel}
          onSelectModel={handleModelChange}
        />

        <QuickTemplateSwitcher
          open={templateSelectorOpen}
          onOpenChange={setTemplateSelectorOpen}
          mode="insert"
          onSelectTemplate={(prompt) => {
            // Dispatch event to insert template into chat input
            window.dispatchEvent(
              new CustomEvent("insert-prompt", { detail: prompt })
            );
          }}
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

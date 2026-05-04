"use client";

import { MODEL_CONFIG } from "@blah-chat/ai/models";
import { getModelConfig } from "@blah-chat/ai/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CanvasPanel } from "@/components/canvas/CanvasPanel";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { CompactConversationDialog } from "@/components/chat/CompactConversationDialog";
import { EmptyScreen } from "@/components/chat/EmptyScreen";
import { MessageListSkeleton } from "@/components/chat/MessageListSkeleton";
import { ModelPreviewModal } from "@/components/chat/ModelPreviewModal";
import { ModelRecommendationBanner } from "@/components/chat/ModelRecommendationBanner";
import { QuickModelSwitcher } from "@/components/chat/QuickModelSwitcher";
import { SetDefaultModelPrompt } from "@/components/chat/SetDefaultModelPrompt";
import type { ThinkingEffort } from "@/components/chat/ThinkingEffortSelector";
import { TTSPlayerBar } from "@/components/chat/TTSPlayerBar";
import { VirtualizedMessageList } from "@/components/chat/VirtualizedMessageList";
import { QuickTemplateSwitcher } from "@/components/templates/QuickTemplateSwitcher";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { TTSProvider } from "@/contexts/TTSContext";
import { useCanvasAutoSync } from "@/hooks/useCanvasAutoSync";
import { useChatKeyboardShortcuts } from "@/hooks/useChatKeyboardShortcuts";
import { useChatModelSelection } from "@/hooks/useChatModelSelection";
import { useComparisonHandlers } from "@/hooks/useComparisonHandlers";
import { useComparisonMode } from "@/hooks/useComparisonMode";
import { useContextLimitEnforcement } from "@/hooks/useContextLimitEnforcement";
import { useConversationIntegrationEvents } from "@/hooks/useConversationIntegrationEvents";
import { useConversationIntegrationSelection } from "@/hooks/useConversationIntegrationSelection";
import { useConversationNavigation } from "@/hooks/useConversationNavigation";
import { useConversationResource } from "@/hooks/useConversationResource";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useMessageAnnouncer } from "@/hooks/useMessageAnnouncer";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { useModelRecommendation } from "@/hooks/useModelRecommendation";
import { useOptimisticMessages } from "@/hooks/useOptimisticMessages";
import { useRestConversationSync } from "@/hooks/useRestConversationSync";
import { useRestMessageSync } from "@/hooks/useRestMessageSync";
import { useTemplateInsertion } from "@/hooks/useTemplateInsertion";
import { useUserPreference } from "@/hooks/useUserPreference";
import { useApiClient } from "@/lib/api/client";
import type { ChatWidth } from "@/lib/utils/chatWidth";

function ChatPageContent({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const unwrappedParams = use(params);
  const conversationId = unwrappedParams.conversationId;
  const router = useRouter();
  const apiClient = useApiClient();
  const searchParams = useSearchParams();
  const highlightMessageId = searchParams.get("messageId") ?? undefined;
  const projectFilter = searchParams.get("project");
  const { conversations: filteredConversations } = useRestConversationSync(
    (projectFilter as string | "none" | null) ?? undefined,
  );
  const { documentId, setDocumentId } = useCanvasContext();

  // Validate conversationId is a real ID (not string "undefined" from bad routing)
  const validConversationId =
    conversationId && conversationId !== "undefined" ? conversationId : null;

  const conversation = useConversationResource(validConversationId);
  const conversationAny = conversation as any;
  const { data: integrationEvents = [] } =
    useConversationIntegrationEvents(validConversationId);
  const {
    results: serverMessages,
    status: paginationStatus,
    loadMore,
    isFirstLoad,
  } = useRestMessageSync({
    conversationId: validConversationId ?? undefined,
  });
  const user = null;

  // Canvas auto-sync with conversation mode and navigation
  const isDocumentMode = conversationAny?.mode === "document";
  const { handleClose: handleCanvasClose } = useCanvasAutoSync({
    conversationId: validConversationId ?? undefined,
    isDocumentMode,
    documentId,
    activeCanvasDocumentId: undefined,
    setDocumentId,
  });

  // Optimistic UI: Overlay local optimistic messages on top of server state
  const { messages, addOptimisticMessages } = useOptimisticMessages({
    serverMessages: serverMessages as any,
  });

  // Announce new messages to screen readers
  const { announcerRef } = useMessageAnnouncer(messages);

  // NOTE: Vim-style j/k navigation is now handled inside VirtualizedMessageList
  // where it has access to grouped message count and Virtuoso scrollToIndex

  // Extract chat width preference
  const rawChatWidth = useUserPreference("chatWidth");
  const chatWidth = (rawChatWidth as ChatWidth | undefined) || "standard";
  const defaultModel = useUserPreference("defaultModel");
  const showModelNamesDuringComparison = useUserPreference(
    "showModelNamesDuringComparison",
  );
  const ttsSpeed = useUserPreference("ttsSpeed");
  const ttsVoice = useUserPreference("ttsVoice");
  const customInstructions = useUserPreference("customInstructions");
  const nickname =
    (customInstructions as { nickname?: string } | undefined)?.nickname || "";
  const autoCompressContext = useUserPreference("autoCompressContext");
  const enableModelRecs = useUserPreference("enableModelRecommendations");

  // Feature toggles for conditional UI elements
  const features = useFeatureToggles();

  // Token usage query (needed before model selection for blocking)
  // TODO: token usage query needs REST endpoint
  const tokenUsage = undefined;

  // State for model switch blocking
  const [blockedModel, setBlockedModel] = useState<{
    modelId: string;
    contextWindow: number;
  } | null>(null);

  const handleModelBlocked = useCallback(
    (modelId: string, contextWindow: number) => {
      setBlockedModel({ modelId, contextWindow });
    },
    [],
  );

  // Model selection with optimistic updates and context limit checking
  const { selectedModel, displayModel, modelLoading, handleModelChange } =
    useChatModelSelection({
      conversationId: validConversationId ?? undefined,
      conversation: conversationAny,
      user,
      defaultModel,
      tokenUsage,
      onModelBlocked: handleModelBlocked,
    });
  const {
    selectedIntegrationIds,
    toggleIntegration,
    isSaving: integrationsSaving,
  } = useConversationIntegrationSelection({
    conversationId: validConversationId,
    initialSelectedIntegrationIds: conversationAny?.selectedIntegrationIds,
  });

  // Context limit enforcement (uses displayModel for accurate percentage)
  const { shouldBlockSend, shouldAutoCompress, percentage, totalTokens } =
    useContextLimitEnforcement({
      tokenUsage,
      modelId: displayModel,
    });

  const [showCompactModal, setShowCompactModal] = useState(false);
  const [isCompacting, setIsCompacting] = useState(false);
  const compactModalShownRef = useRef(false);
  const autoCompressTriggeredRef = useRef(false);

  // Show modal when context limit is reached (95%)
  useEffect(() => {
    if (
      shouldBlockSend &&
      !compactModalShownRef.current &&
      validConversationId
    ) {
      compactModalShownRef.current = true;
      setShowCompactModal(true);
    }
  }, [shouldBlockSend, validConversationId]);

  // Reset flags when conversation changes
  useEffect(() => {
    compactModalShownRef.current = false;
    autoCompressTriggeredRef.current = false;
  }, [conversationId]);

  // Auto-compress at 75% when setting is enabled
  const triggerAutoCompress = useCallback(async () => {
    if (!validConversationId || !conversationAny?.model) return;

    setIsCompacting(true);
    try {
      const { conversationId: newConversationId } = await apiClient.post<{
        conversationId: string;
      }>(`/api/v1/conversations/${validConversationId}/compact`, {
        targetModel: conversationAny.model,
      });
      setIsCompacting(false);
      toast.success("Conversation compacted");
      router.push(`/chat/${newConversationId}`);
    } catch (error) {
      setIsCompacting(false);
      toast.error(
        `Failed to auto-compress: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      autoCompressTriggeredRef.current = false; // Allow retry on error
    }
  }, [apiClient, validConversationId, conversationAny?.model, router]);

  useEffect(() => {
    if (
      autoCompressContext &&
      shouldAutoCompress &&
      !autoCompressTriggeredRef.current &&
      !isCompacting &&
      validConversationId &&
      conversationAny?.model
    ) {
      autoCompressTriggeredRef.current = true;
      triggerAutoCompress();
    }
  }, [
    autoCompressContext,
    shouldAutoCompress,
    isCompacting,
    validConversationId,
    conversationAny?.model,
    triggerAutoCompress,
  ]);

  const handleCompact = async () => {
    if (!validConversationId) return;
    setIsCompacting(true);
    try {
      const { conversationId: newConversationId } = await apiClient.post<{
        conversationId: string;
      }>(`/api/v1/conversations/${validConversationId}/compact`, {
        targetModel: conversationAny?.model,
      });
      setIsCompacting(false);
      toast.success("Conversation compacted");
      setShowCompactModal(false);
      router.push(`/chat/${newConversationId}`);
    } catch (error) {
      setIsCompacting(false);
      toast.error(
        `Failed to compact: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleStartFresh = () => {
    setShowCompactModal(false);
    router.push("/chat");
  };

  const [thinkingEffort, setThinkingEffort] = useState<ThinkingEffort>("none");
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
    parseAsBoolean.withDefault(showModelNamesDuringComparison),
  );

  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [, setIsScrollReady] = useState(true); // Used by VirtualizedMessageList callback

  // Ref for infinite scroll at top of message list
  const messageListTopRef = useRef<HTMLDivElement | null>(null);

  const { isActive, selectedModels, startComparison, exitComparison } =
    useComparisonMode();
  const { isMobile, isTouchDevice } = useMobileDetect();

  // Comparison voting and consolidation handlers
  const { handleVote, handleConsolidate } = useComparisonHandlers({
    conversationId: validConversationId ?? undefined,
    messages,
  });

  // Model recommendation (extracted to hook)
  const modelRecommendation = useModelRecommendation({
    conversation: conversationAny,
    messages,
    onModelChange: handleModelChange,
  });

  // Keyboard shortcuts (⌘J for model switcher, ⌘; for templates)
  useChatKeyboardShortcuts({
    onOpenQuickSwitcher: useCallback(() => setQuickSwitcherOpen(true), []),
    onOpenTemplateSelector: useCallback(
      () => setTemplateSelectorOpen(true),
      [],
    ),
  });

  // Template insertion from sessionStorage (after navigation from templates page)
  useTemplateInsertion();

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

  // react-doctor: navigation must follow async state
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

  // Derived state that handles loading gracefully
  const isGenerating =
    messages?.some(
      (m) =>
        m.role === "assistant" &&
        ["pending", "generating"].includes(m.status || ""),
    ) ?? false;
  const activeLeafMessageId = messages
    ?.filter(
      (
        message,
      ): message is typeof message & {
        isActiveBranch: true;
      } => "isActiveBranch" in message && message.isActiveBranch === true,
    )
    .at(-1)?._id;

  const modelConfig = getModelConfig(displayModel);
  // Show selector if model has reasoning config OR "thinking" capability (native reasoning)
  const showThinkingEffort =
    !!modelConfig?.reasoning || modelConfig?.capabilities?.includes("thinking");
  const hasMessages = (messages?.length ?? 0) > 0;
  const transcriptEntries = useMemo(
    () =>
      [...(messages ?? []), ...integrationEvents].sort((a, b) => {
        const aTime = a.createdAt ?? a._creationTime ?? 0;
        const bTime = b.createdAt ?? b._creationTime ?? 0;
        if (aTime !== bTime) {
          return aTime - bTime;
        }

        return String(a._id).localeCompare(String(b._id));
      }),
    [integrationEvents, messages],
  );

  // Navigation between conversations
  const { isFirst, isLast, navigateToPrevious, navigateToNext } =
    useConversationNavigation({
      conversationId: validConversationId ?? undefined,
      filteredConversations,
    });

  // Only wait for messages to load - Virtuoso handles scroll positioning natively
  const isLoading = messages === undefined;
  const showSkeleton = isLoading;
  const isEmpty =
    !isLoading &&
    !isFirstLoad &&
    messages &&
    messages.length === 0 &&
    paginationStatus !== "LoadingFirstPage"; // Don't show empty during initial pagination load

  // Autofocus input when navigating to conversation (after loading completes)
  useEffect(() => {
    if (!conversationId || isMobile || isTouchDevice || isLoading) return;

    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("focus-chat-input"));
    }, 50);

    return () => clearTimeout(timer);
  }, [conversationId, isMobile, isTouchDevice, isLoading]);

  return (
    <TTSProvider defaultSpeed={ttsSpeed} defaultVoice={ttsVoice}>
      {/* Skip links for keyboard navigation */}
      <nav aria-label="Skip links" className="skip-links">
        <a
          href="#chat-messages"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-background focus:p-2 focus:rounded focus:ring-2 focus:ring-ring"
        >
          Skip to messages
        </a>
        <a
          href="#chat-input"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-36 focus:z-50 focus:bg-background focus:p-2 focus:rounded focus:ring-2 focus:ring-ring"
        >
          Skip to compose
        </a>
        <a
          href="#conversation-list"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-64 focus:z-50 focus:bg-background focus:p-2 focus:rounded focus:ring-2 focus:ring-ring"
        >
          Skip to conversations
        </a>
      </nav>

      {/* Screen reader announcer for new messages */}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
      />

      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1 min-h-0"
        id="chat-canvas-layout"
      >
        {/* Chat Panel - always renders, takes full width when canvas closed */}
        <ResizablePanel defaultSize={documentId ? 45 : 100} minSize={30}>
          <div className="flex flex-col h-full">
            <ChatHeader
              conversation={conversationAny}
              conversationId={validConversationId!}
              selectedModel={displayModel}
              modelLoading={modelLoading}
              hasMessages={hasMessages}
              isFirst={isFirst}
              isLast={isLast}
              isComparisonActive={isActive}
              comparisonModelCount={selectedModels.length}
              showProjects={features.showProjects}
              onNavigatePrevious={navigateToPrevious}
              onNavigateNext={navigateToNext}
              onModelBadgeClick={() => setModelSelectorOpen(true)}
              onComparisonBadgeClick={() => setComparisonDialogOpen(true)}
            />

            <TTSPlayerBar />

            <div className="flex-1 flex flex-col min-h-0 relative">
              {/* Skeleton overlay - shows while loading or scroll positioning */}
              <AnimatePresence>
                {showSkeleton && (
                  <motion.div
                    key="skeleton-overlay"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 z-10 bg-background"
                  >
                    <MessageListSkeleton chatWidth={chatWidth} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message content - always rendered when loaded */}
              {!isLoading && (
                <motion.div
                  key={`messages-${conversationId}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col min-h-0"
                >
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

                  {/* Empty state - only show when everything is loaded and no messages */}
                  {isEmpty ? (
                    <div className="flex items-center justify-center h-full w-full">
                      <EmptyScreen
                        selectedModel={displayModel}
                        conversationCount={filteredConversations?.length ?? 0}
                        nickname={nickname}
                        onClick={(val: string) => {
                          const event = new CustomEvent("insert-prompt", {
                            detail: val,
                          });
                          window.dispatchEvent(event);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 max-h-full min-h-0 min-w-0 relative flex flex-col overflow-hidden">
                      <VirtualizedMessageList
                        key={validConversationId}
                        conversationId={validConversationId!}
                        conversation={conversationAny}
                        messages={transcriptEntries}
                        chatWidth={chatWidth}
                        onVote={handleVote}
                        onConsolidate={handleConsolidate}
                        onToggleModelNames={() =>
                          setShowModelNames(!showModelNames)
                        }
                        showModelNames={showModelNames ?? false}
                        highlightMessageId={highlightMessageId}
                        isCollaborative={conversationAny?.isCollaborative}
                        onScrollReady={setIsScrollReady}
                        isGenerating={isGenerating}
                      />
                    </div>
                  )}

                  {/* Model Recommendation Banner */}
                  {enableModelRecs !== false &&
                    conversationAny?.modelRecommendation &&
                    !conversationAny.modelRecommendation.dismissed &&
                    validConversationId && (
                      <ModelRecommendationBanner
                        recommendation={conversationAny.modelRecommendation}
                        conversationId={validConversationId}
                        onSwitch={modelRecommendation.handleSwitchModel}
                        onPreview={modelRecommendation.handlePreviewModel}
                      />
                    )}

                  {/* Set Default Model Prompt (shows after successful generation) */}
                  {modelRecommendation.showSetDefaultPrompt &&
                    modelRecommendation.switchedModelId &&
                    validConversationId && (
                      <SetDefaultModelPrompt
                        modelId={modelRecommendation.switchedModelId}
                        modelName={
                          MODEL_CONFIG[modelRecommendation.switchedModelId]
                            ?.name ?? modelRecommendation.switchedModelId
                        }
                        conversationId={validConversationId}
                        onSetDefault={modelRecommendation.handleSetAsDefault}
                        onDismiss={modelRecommendation.dismissSetDefaultPrompt}
                      />
                    )}

                  {/* Preview Modal */}
                  {modelRecommendation.previewModalOpen &&
                    modelRecommendation.previewModelId &&
                    conversationAny?.modelRecommendation &&
                    validConversationId && (
                      <ModelPreviewModal
                        open={modelRecommendation.previewModalOpen}
                        onOpenChange={modelRecommendation.setPreviewModalOpen}
                        currentModelId={
                          conversationAny.modelRecommendation.currentModelId
                        }
                        suggestedModelId={modelRecommendation.previewModelId}
                        currentResponse={
                          messages?.find((m) => m.role === "assistant")
                            ?.content ?? ""
                        }
                        onSwitch={modelRecommendation.handleSwitchModel}
                        conversationId={validConversationId}
                        userMessage={
                          messages?.find((m) => m.role === "user")?.content ??
                          ""
                        }
                      />
                    )}

                  <QuickModelSwitcher
                    open={quickSwitcherOpen}
                    onOpenChange={setQuickSwitcherOpen}
                    currentModel={selectedModel}
                    onSelectModel={handleModelChange}
                    currentTokenUsage={totalTokens}
                  />

                  <QuickTemplateSwitcher
                    open={templateSelectorOpen}
                    onOpenChange={setTemplateSelectorOpen}
                    mode="insert"
                    onSelectTemplate={(prompt) => {
                      // Dispatch event to insert template into chat input
                      window.dispatchEvent(
                        new CustomEvent("insert-prompt", { detail: prompt }),
                      );
                    }}
                  />

                  <CompactConversationDialog
                    open={showCompactModal}
                    onOpenChange={setShowCompactModal}
                    trigger="threshold"
                    currentPercentage={percentage}
                    onStartFresh={handleStartFresh}
                    onCompact={handleCompact}
                    isCompacting={isCompacting}
                  />

                  {/* Model switch blocked dialog */}
                  <CompactConversationDialog
                    open={blockedModel !== null}
                    onOpenChange={(open) => !open && setBlockedModel(null)}
                    trigger="model-switch"
                    targetModel={
                      blockedModel
                        ? {
                            id: blockedModel.modelId,
                            name:
                              MODEL_CONFIG[blockedModel.modelId]?.name ??
                              blockedModel.modelId,
                            contextWindow: blockedModel.contextWindow,
                          }
                        : undefined
                    }
                    currentTokens={totalTokens}
                    onStartFresh={handleStartFresh}
                    onCompact={async () => {
                      if (!validConversationId || !blockedModel) return;
                      setIsCompacting(true);
                      try {
                        const { conversationId: newConversationId } =
                          await apiClient.post<{
                            conversationId: string;
                          }>(
                            `/api/v1/conversations/${validConversationId}/compact`,
                            {
                              targetModel: blockedModel.modelId,
                            },
                          );
                        setIsCompacting(false);
                        toast.success("Conversation compacted");
                        setBlockedModel(null);
                        router.push(`/chat/${newConversationId}`);
                      } catch (error) {
                        setIsCompacting(false);
                        toast.error(
                          `Failed to compact: ${error instanceof Error ? error.message : "Unknown error"}`,
                        );
                      }
                    }}
                    isCompacting={isCompacting}
                  />
                </motion.div>
              )}

              {/* ChatInput - always rendered to preserve focus and input state during navigation */}
              <div id="chat-input" className="flex shrink-0">
                <ChatInput
                  conversationId={validConversationId!}
                  parentMessageId={activeLeafMessageId}
                  chatWidth={chatWidth}
                  isGenerating={isGenerating}
                  selectedModel={displayModel}
                  onModelChange={handleModelChange}
                  selectedIntegrationIds={selectedIntegrationIds}
                  onToggleIntegration={toggleIntegration}
                  integrationsSaving={integrationsSaving}
                  thinkingEffort={
                    showThinkingEffort ? thinkingEffort : undefined
                  }
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
                  onTemplateSelectorOpenChange={setTemplateSelectorOpen}
                  onOptimisticUpdate={addOptimisticMessages}
                />
              </div>
            </div>
          </div>
        </ResizablePanel>

        {/* Canvas Panel - hidden on mobile */}
        {documentId && !isMobile && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={55} minSize={25}>
              <CanvasPanel
                documentId={documentId}
                onClose={handleCanvasClose}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </TTSProvider>
  );
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  return <ChatPageContent params={params} />;
}

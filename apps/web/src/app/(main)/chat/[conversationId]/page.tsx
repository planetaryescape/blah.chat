"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { usePaginatedQuery, useQuery } from "convex-helpers/react/cache";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { CanvasPanel } from "@/components/canvas/CanvasPanel";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
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
import { useConversationContext } from "@/contexts/ConversationContext";
import { TTSProvider } from "@/contexts/TTSContext";
import { useCanvasAutoSync } from "@/hooks/useCanvasAutoSync";
import { useChatKeyboardShortcuts } from "@/hooks/useChatKeyboardShortcuts";
import { useChatModelSelection } from "@/hooks/useChatModelSelection";
import { useComparisonHandlers } from "@/hooks/useComparisonHandlers";
import { useComparisonMode } from "@/hooks/useComparisonMode";
import { useConversationNavigation } from "@/hooks/useConversationNavigation";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { useModelRecommendation } from "@/hooks/useModelRecommendation";
import { useOptimisticMessages } from "@/hooks/useOptimisticMessages";
import { useTemplateInsertion } from "@/hooks/useTemplateInsertion";
import { useUserPreference } from "@/hooks/useUserPreference";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { getModelConfig } from "@/lib/ai/utils";
import type { ChatWidth } from "@/lib/utils/chatWidth";

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
  const { documentId, setDocumentId } = useCanvasContext();

  const activeCanvasDocument = useQuery(
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    api.canvas.documents.getByConversation,
    conversationId ? { conversationId } : "skip",
  );

  const conversation = useQuery(
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    api.conversations.get,
    conversationId ? { conversationId } : "skip",
  );
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

  // Canvas auto-sync with conversation mode and navigation
  const isDocumentMode = conversation?.mode === "document";
  const { handleClose: handleCanvasClose } = useCanvasAutoSync({
    conversationId,
    isDocumentMode,
    documentId,
    activeCanvasDocumentId: activeCanvasDocument?._id,
    setDocumentId,
  });

  // Optimistic UI: Overlay local optimistic messages on top of server state
  const { messages, addOptimisticMessages } = useOptimisticMessages({
    serverMessages,
  });

  // Extract chat width preference with loading detection
  const rawChatWidth = useQuery(api.users.getUserPreference, {
    key: "chatWidth",
  });
  const isChatWidthLoading = rawChatWidth === undefined;
  const chatWidth = (rawChatWidth as ChatWidth | undefined) || "standard";
  const defaultModel = useUserPreference("defaultModel");
  const showModelNamesDuringComparison = useUserPreference(
    "showModelNamesDuringComparison",
  );
  const ttsSpeed = useUserPreference("ttsSpeed");

  // Feature toggles for conditional UI elements
  const features = useFeatureToggles();

  // Model selection with optimistic updates
  const { selectedModel, displayModel, modelLoading, handleModelChange } =
    useChatModelSelection({
      conversationId,
      conversation,
      user,
      defaultModel,
    });

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

  // Ref for infinite scroll at top of message list
  const messageListTopRef = useRef<HTMLDivElement | null>(null);

  const { isActive, selectedModels, startComparison, exitComparison } =
    useComparisonMode();
  const { isMobile, isTouchDevice } = useMobileDetect();

  // Comparison voting and consolidation handlers
  const { handleVote, handleConsolidate } = useComparisonHandlers({
    conversationId,
    messages,
  });

  // Model recommendation (extracted to hook)
  const modelRecommendation = useModelRecommendation({
    conversation,
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

  const modelConfig = getModelConfig(displayModel);
  // Show selector if model has reasoning config OR "thinking" capability (native reasoning)
  const showThinkingEffort =
    !!modelConfig?.reasoning || modelConfig?.capabilities?.includes("thinking");
  const hasMessages = (messages?.length ?? 0) > 0;

  // Navigation between conversations
  const { isFirst, isLast, navigateToPrevious, navigateToNext } =
    useConversationNavigation({
      conversationId,
      filteredConversations,
    });

  const isLoading =
    serverMessages === undefined ||
    paginationStatus === "LoadingFirstPage" ||
    isChatWidthLoading;

  return (
    <TTSProvider defaultSpeed={ttsSpeed}>
      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1 min-h-0"
        id="chat-canvas-layout"
      >
        {/* Chat Panel - always renders, takes full width when canvas closed */}
        <ResizablePanel defaultSize={documentId ? 45 : 100} minSize={30}>
          <div className="flex flex-col h-full">
            <ChatHeader
              conversation={conversation}
              conversationId={conversationId}
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

            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <MessageListSkeleton chatWidth={chatWidth} />
                </motion.div>
              ) : (
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

                  <VirtualizedMessageList
                    messages={messages as Doc<"messages">[]}
                    selectedModel={displayModel}
                    chatWidth={chatWidth}
                    isGenerating={isGenerating}
                    onVote={handleVote}
                    onConsolidate={handleConsolidate}
                    onToggleModelNames={() =>
                      setShowModelNames(!showModelNames)
                    }
                    showModelNames={showModelNames ?? false}
                    highlightMessageId={highlightMessageId}
                    isCollaborative={conversation?.isCollaborative}
                  />

                  {/* Model Recommendation Banner */}
                  {conversation?.modelRecommendation &&
                    !conversation.modelRecommendation.dismissed && (
                      <ModelRecommendationBanner
                        recommendation={conversation.modelRecommendation}
                        conversationId={conversationId}
                        onSwitch={modelRecommendation.handleSwitchModel}
                        onPreview={modelRecommendation.handlePreviewModel}
                      />
                    )}

                  {/* Set Default Model Prompt (shows after successful generation) */}
                  {modelRecommendation.showSetDefaultPrompt &&
                    modelRecommendation.switchedModelId && (
                      <SetDefaultModelPrompt
                        modelId={modelRecommendation.switchedModelId}
                        modelName={
                          MODEL_CONFIG[modelRecommendation.switchedModelId]
                            ?.name ?? modelRecommendation.switchedModelId
                        }
                        conversationId={conversationId}
                        onSetDefault={modelRecommendation.handleSetAsDefault}
                        onDismiss={modelRecommendation.dismissSetDefaultPrompt}
                      />
                    )}

                  {/* Preview Modal */}
                  {modelRecommendation.previewModalOpen &&
                    modelRecommendation.previewModelId &&
                    conversation?.modelRecommendation && (
                      <ModelPreviewModal
                        open={modelRecommendation.previewModalOpen}
                        onOpenChange={modelRecommendation.setPreviewModalOpen}
                        currentModelId={
                          conversation.modelRecommendation.currentModelId
                        }
                        suggestedModelId={modelRecommendation.previewModelId}
                        currentResponse={
                          messages?.find((m) => m.role === "assistant")
                            ?.content ?? ""
                        }
                        onSwitch={modelRecommendation.handleSwitchModel}
                        conversationId={conversationId}
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* ChatInput always rendered - prevents focus loss during loading state transitions */}
            <div className="flex shrink-0">
              <ChatInput
                conversationId={conversationId}
                chatWidth={chatWidth}
                isGenerating={isGenerating}
                selectedModel={displayModel}
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
          </div>
        </ResizablePanel>

        {/* Canvas Panel - conditionally rendered */}
        {documentId && (
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
  params: Promise<{ conversationId: Id<"conversations"> }>;
}) {
  return <ChatPageContent params={params} />;
}

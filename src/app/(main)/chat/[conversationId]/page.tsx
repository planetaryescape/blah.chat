'use client';

import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageListSkeleton } from '@/components/chat/MessageListSkeleton';
import { ModelPreviewModal } from '@/components/chat/ModelPreviewModal';
import { ModelRecommendationBanner } from '@/components/chat/ModelRecommendationBanner';
import { QuickModelSwitcher } from '@/components/chat/QuickModelSwitcher';
import { SetDefaultModelPrompt } from '@/components/chat/SetDefaultModelPrompt';
import type { ThinkingEffort } from '@/components/chat/ThinkingEffortSelector';
import { TTSPlayerBar } from '@/components/chat/TTSPlayerBar';
import { VirtualizedMessageList } from '@/components/chat/VirtualizedMessageList';
import { QuickTemplateSwitcher } from '@/components/templates/QuickTemplateSwitcher';
import { Button } from '@/components/ui/button';
import { ProgressiveHints } from '@/components/ui/ProgressiveHints';
import { useConversationContext } from '@/contexts/ConversationContext';
import { TTSProvider } from '@/contexts/TTSContext';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { useComparisonMode } from '@/hooks/useComparisonMode';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { useMobileDetect } from '@/hooks/useMobileDetect';
import { useUserPreference } from '@/hooks/useUserPreference';
import { MODEL_CONFIG } from '@/lib/ai/models';
import { DEFAULT_MODEL_ID } from '@/lib/ai/operational-models';
import { getModelConfig, isValidModel } from '@/lib/ai/utils';
import type { ChatWidth } from '@/lib/utils/chatWidth';
import type { OptimisticMessage } from '@/types/optimistic';
import { usePaginatedQuery, useQuery } from 'convex-helpers/react/cache';
import { useMutation } from 'convex/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseAsBoolean, useQueryState } from 'nuqs';
import {
  Suspense,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

function ChatPageContent({
  params,
}: {
  params: Promise<{ conversationId: Id<'conversations'> }>;
}) {
  const unwrappedParams = use(params);
  const conversationId = unwrappedParams.conversationId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightMessageId = searchParams.get('messageId') ?? undefined;

  const { filteredConversations } = useConversationContext();

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const conversation = useQuery(
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    api.conversations.get,
    conversationId ? { conversationId } : 'skip'
  );
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const {
    results: serverMessages,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.messages.listPaginated,
    conversationId ? { conversationId } : 'skip',
    {
      initialNumItems: 50,
    }
  );
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);

  // Optimistic UI: Overlay local optimistic messages on top of server state
  // Using useState instead of useOptimistic for instant rendering with TanStack Query
  type ServerMessage = NonNullable<typeof serverMessages>[number];
  type MessageWithOptimistic = ServerMessage | OptimisticMessage;

  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticMessage[]
  >([]);

  // Callback for ChatInput to add optimistic messages (instant, before API call)
  const addOptimisticMessages = useCallback(
    (newMessages: OptimisticMessage[]) => {
      setOptimisticMessages((prev) => [...prev, ...newMessages]);
    },
    []
  );

  // Merge server messages with optimistic messages, deduplicating confirmed ones
  const messages = useMemo<MessageWithOptimistic[]>(() => {
    const server = (serverMessages || []) as MessageWithOptimistic[];

    if (optimisticMessages.length === 0) {
      return server;
    }

    // Filter out optimistic messages that have been confirmed by server
    // Match by role + timestamp within 2s window (handles network delays)
    const pendingOptimistic = optimisticMessages.filter((opt) => {
      const hasServerVersion = server.some(
        (m) =>
          m.role === opt.role && Math.abs(m.createdAt - opt.createdAt) < 2000
      );
      return !hasServerVersion;
    });

    // Merge and sort chronologically (don't clear state here to avoid blink)
    return [...server, ...pendingOptimistic].sort(
      (a, b) => a.createdAt - b.createdAt
    );
  }, [serverMessages, optimisticMessages]);

  // NOTE: We intentionally don't clean up optimistic messages from state
  // The useMemo already filters them out visually when server confirms.
  // Keeping them in state avoids the re-render that causes flash.
  // They'll be cleared naturally on next message send or page navigation.

  // Extract chat width preference (Phase 4: use flat preference hook)
  const prefChatWidth = useUserPreference('chatWidth');
  const chatWidth = (prefChatWidth as ChatWidth | undefined) || 'standard';

  // Feature toggles for conditional UI elements
  const features = useFeatureToggles();

  // Calculate final model selection based on priority logic
  // Only show the model once both conversation and user data are loaded
  const { selectedModel, modelLoading } = useMemo(() => {
    // Show loading until we have definitive answers about both conversation and user
    const conversationLoaded = conversation !== undefined; // null = not found, undefined = loading
    const userLoaded = user !== undefined;

    if (!conversationLoaded || !userLoaded) {
      return { selectedModel: '', modelLoading: true };
    }

    // Now we can determine the final model without flickering
    let finalModel = DEFAULT_MODEL_ID;

    // Priority 1: Conversation model (if valid)
    if (conversation?.model && isValidModel(conversation.model)) {
      finalModel = conversation.model;
    }
    // Priority 2: User's default model (if valid)
    else if (
      user?.preferences?.defaultModel &&
      isValidModel(user.preferences.defaultModel)
    ) {
      finalModel = user.preferences.defaultModel;
    }
    // Priority 3: System default (always valid)
    else {
      finalModel = DEFAULT_MODEL_ID;
    }

    return { selectedModel: finalModel, modelLoading: false };
  }, [conversation, user]);

  // Separate state for optimistic updates during model changes
  const [optimisticModel, setOptimisticModel] = useState<string | null>(null);

  // The actual model to display - prefers optimistic updates over stable state
  const displayModel = optimisticModel || selectedModel;

  const [thinkingEffort, setThinkingEffort] =
    useState<ThinkingEffort>('medium');
  const [attachments, setAttachments] = useState<
    Array<{
      type: 'file' | 'image' | 'audio';
      name: string;
      storageId: string;
      mimeType: string;
      size: number;
    }>
  >([]);

  // URL state for comparison view toggles
  const [showModelNames, setShowModelNames] = useQueryState(
    'showModelNames',
    parseAsBoolean.withDefault(
      user?.preferences?.showModelNamesDuringComparison ?? false
    )
  );
  const [syncScroll, _setSyncScroll] = useQueryState(
    'syncScroll',
    parseAsBoolean.withDefault(true)
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
    api.conversations.createConsolidationConversation
  );
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const consolidateInPlace = useMutation(
    api.conversations.consolidateInSameChat
  );
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateModelMutation = useMutation(api.conversations.updateModel);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updatePreferences = useMutation(api.users.updatePreferences);

  const handleModelChange = useCallback(
    async (modelId: string) => {
      // Optimistic update - shows immediately while persisting
      setOptimisticModel(modelId);

      // Persist to DB if conversation exists
      if (conversationId) {
        try {
          await updateModelMutation({
            conversationId,
            model: modelId,
          });
          // Clear optimistic state after successful persist
          setOptimisticModel(null);
        } catch (error) {
          console.error('Failed to persist model:', error);
          // Revert optimistic update on failure
          setOptimisticModel(null);
        }
      }
      // New conversations: model saved when first message sent (chat.ts:75)
    },
    [conversationId, updateModelMutation]
  );

  const handleVote = async (winnerId: string, rating: string) => {
    // Only handle votes for server-confirmed messages (not optimistic)
    const msg = messages?.find(
      (m) => !('_optimistic' in m) && m._id === winnerId
    );
    if (msg?.comparisonGroupId) {
      const voteRating = rating as
        | 'left_better'
        | 'right_better'
        | 'tie'
        | 'both_bad';
      await recordVote({
        comparisonGroupId: msg.comparisonGroupId,
        winnerId: msg._id as Id<'messages'>,
        rating: voteRating,
      });
    }
  };

  const handleConsolidate = async (
    model: string,
    mode: 'same-chat' | 'new-chat'
  ) => {
    const msg = messages?.find((m) => m.comparisonGroupId);
    if (!msg?.comparisonGroupId) return;

    if (mode === 'same-chat') {
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
    [handleModelChange]
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
        lastMessage.role === 'assistant' &&
        lastMessage.status === 'complete' &&
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
    window.addEventListener('open-quick-model-switcher', handler);
    return () =>
      window.removeEventListener('open-quick-model-switcher', handler);
  }, []);

  // Quick template switcher keyboard shortcut (⌘;)
  useEffect(() => {
    const handler = () => setTemplateSelectorOpen(true);
    window.addEventListener('open-quick-template-switcher', handler);
    return () =>
      window.removeEventListener('open-quick-template-switcher', handler);
  }, []);

  // Handle template insertion from sessionStorage (after navigation from templates page)
  useEffect(() => {
    const insertTemplate = searchParams.get('insertTemplate');
    if (insertTemplate !== 'true') return;

    // Read template text from sessionStorage
    const templateText = sessionStorage.getItem('pending-template-text');
    if (templateText) {
      // Clear sessionStorage
      sessionStorage.removeItem('pending-template-text');

      // Dispatch insert-prompt event after a brief delay to ensure ChatInput is mounted
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('insert-prompt', { detail: templateText })
        );
        window.dispatchEvent(new CustomEvent('focus-chat-input'));
      }, 100);
    }

    // Clean up URL param
    const url = new URL(window.location.href);
    url.searchParams.delete('insertTemplate');
    router.replace(url.pathname + url.search, { scroll: false });
  }, [searchParams, router]);

  // Model preview modal (from recommendation banner)
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ modelId: string }>;
      setPreviewModelId(customEvent.detail.modelId);
      setPreviewModalOpen(true);
    };
    window.addEventListener('open-model-preview', handler);
    return () => window.removeEventListener('open-model-preview', handler);
  }, []);

  // Infinite scroll for loading more messages (at top of list)
  useEffect(() => {
    if (!messageListTopRef.current || paginationStatus !== 'CanLoadMore') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && paginationStatus === 'CanLoadMore') {
          loadMore(50);
        }
      },
      { threshold: 1.0 }
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
      router.push('/app');
    }
  }, [conversation, router]);

  // Autofocus input when navigating to conversation
  useEffect(() => {
    if (!conversationId || isMobile || isTouchDevice) return;

    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('focus-chat-input'));
    }, 50);

    return () => clearTimeout(timer);
  }, [conversationId, isMobile, isTouchDevice]);

  // Derived state that handles loading gracefully
  const isGenerating =
    messages?.some(
      (m) =>
        m.role === 'assistant' &&
        ['pending', 'generating'].includes(m.status || '')
    ) ?? false;

  const modelConfig = getModelConfig(displayModel);
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
      (a, b) => b._creationTime - a._creationTime
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
      (a, b) => b._creationTime - a._creationTime
    );
    const prevIdx = Math.max(currentIndex - 1, 0);
    router.push(`/chat/${sorted[prevIdx]._id}`);
  };

  const navigateToNext = () => {
    if (isLast || !filteredConversations?.length) return;

    const sorted = [...filteredConversations].sort(
      (a, b) => b._creationTime - a._creationTime
    );
    const nextIdx = Math.min(currentIndex + 1, sorted.length - 1);
    router.push(`/chat/${sorted[nextIdx]._id}`);
  };

  return (
    <TTSProvider defaultSpeed={user?.preferences?.ttsSpeed ?? 1}>
      <div className="relative flex h-[100dvh] flex-col overflow-hidden">
        <ChatHeader
          conversation={conversation}
          conversationId={conversationId}
          selectedModel={displayModel}
          modelLoading={modelLoading}
          hasMessages={hasMessages}
          messageCount={messageCount}
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

        {serverMessages === undefined ||
        paginationStatus === 'LoadingFirstPage' ? (
          <MessageListSkeleton chatWidth={chatWidth} />
        ) : (
          <>
            {/* Load More Button (fallback for top of list) */}
            {paginationStatus === 'CanLoadMore' && (
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
            {paginationStatus === 'LoadingMore' && (
              <div className="flex justify-center p-4">
                <div className="text-sm text-muted-foreground">
                  Loading more messages...
                </div>
              </div>
            )}

            {/* Invisible div for intersection observer */}
            <div ref={messageListTopRef} className="h-px" />

            <VirtualizedMessageList
              messages={messages as Doc<'messages'>[]}
              selectedModel={displayModel}
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
                messages?.find((m) => m.role === 'assistant')?.content ?? ''
              }
              onSwitch={handleSwitchModel}
              conversationId={conversationId}
              userMessage={
                messages?.find((m) => m.role === 'user')?.content ?? ''
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
              new CustomEvent('insert-prompt', { detail: prompt })
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
  params: Promise<{ conversationId: Id<'conversations'> }>;
}) {
  return (
    <Suspense>
      <ChatPageContent params={params} />
    </Suspense>
  );
}

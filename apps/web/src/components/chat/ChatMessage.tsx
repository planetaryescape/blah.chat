"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle } from "lucide-react";
import { memo, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCachedAttachments, useCachedToolCalls } from "@/hooks/useCacheSync";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useMessageKeyboardShortcuts } from "@/hooks/useMessageKeyboardShortcuts";
import { useUserPreference } from "@/hooks/useUserPreference";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { getModelConfig } from "@/lib/ai/utils";
import { cn } from "@/lib/utils";
import { formatTTFT, isCachedResponse } from "@/lib/utils/formatMetrics";
import type { OptimisticMessage } from "@/types/optimistic";
import { FeedbackModal } from "../feedback/FeedbackModal";
import { ArtifactList } from "./ArtifactList";
import { AttachmentRenderer } from "./AttachmentRenderer";
import { InlineToolCallContent } from "./InlineToolCallContent";
import { MessageActions } from "./MessageActions";
import { MessageBranchIndicator } from "./MessageBranchIndicator";
import { MessageConsolidationToggle } from "./MessageConsolidationToggle";
import { MessageEditMode } from "./MessageEditMode";
import { MessageLoadingState } from "./MessageLoadingState";
import { MessageNotesIndicator } from "./MessageNotesIndicator";
import { MessageStatsBadges } from "./MessageStatsBadges";
import { ModelRecommendationBanner } from "./ModelRecommendationBanner";
import { ReasoningBlock } from "./ReasoningBlock";
import { SourceList } from "./SourceList";

// Error display component with feedback modal integration
function ErrorDisplay({ error }: { error?: string }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 p-1">
      <div className="flex items-center gap-2 text-amber-500/90 dark:text-amber-400/90">
        <AlertCircle className="w-4 h-4" />
        <span className="font-medium text-sm">Unable to generate response</span>
      </div>
      <div className="bg-muted/30 rounded-md p-3 border border-border/50">
        <p className="text-sm leading-relaxed opacity-90 break-words">
          {error}
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>Try a different model or</span>
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="underline hover:text-foreground transition-colors cursor-pointer"
        >
          contact support
        </button>
      </div>
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}

interface ChatMessageProps {
  message: Doc<"messages"> | OptimisticMessage;
  nextMessage?: Doc<"messages"> | OptimisticMessage;
  readOnly?: boolean;
  isCollaborative?: boolean;
  senderUser?: { name?: string; imageUrl?: string } | null;
}

export const ChatMessage = memo(
  function ChatMessage({
    message,
    nextMessage,
    readOnly,
    isCollaborative,
    senderUser,
  }: ChatMessageProps) {
    const [showOriginals, setShowOriginals] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState("");
    const messageRef = useRef<HTMLDivElement>(null);

    const isUser = message.role === "user";
    const isGenerating = ["pending", "generating"].includes(message.status);
    const isError = message.status === "error";
    const _isStopped = message.status === "stopped";

    // Check if this is a temporary optimistic message (not yet persisted)
    const isTempMessage =
      typeof message._id === "string" && message._id.startsWith("temp-");

    // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
    const editMessage = useMutation(api.chat.editMessage);

    // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
    const updateModel = useMutation(api.conversations.updateModel);

    // Phase 4: Use new preference hooks
    const prefAlwaysShowActions = useUserPreference("alwaysShowMessageActions");
    const prefShowStats = useUserPreference("showMessageStatistics");

    const alwaysShow = prefAlwaysShowActions;
    const showStats = prefShowStats;
    const features = useFeatureToggles();

    // Query for original responses if this is a consolidated message
    const originalResponses = useQuery(
      api.messages.getOriginalResponses,
      message.isConsolidation && !isTempMessage
        ? { consolidatedMessageId: message._id as Id<"messages"> }
        : "skip",
    );

    // Query conversation for model recommendation (cost optimization)
    const conversation = useQuery(api.conversations.get, {
      conversationId: message.conversationId,
    });

    const displayContent = message.partialContent || message.content || "";

    // Check if this is a thinking/reasoning model
    const modelConfig = message.model ? getModelConfig(message.model) : null;
    const modelName =
      modelConfig?.name || message.model?.split(":")[1] || message.model;
    const isThinkingModel =
      !!modelConfig?.reasoning ||
      modelConfig?.capabilities?.includes("extended-thinking") ||
      modelConfig?.capabilities?.includes("thinking") ||
      false;

    // Calculate performance metrics
    const ttft =
      message.firstTokenAt && message.generationStartedAt
        ? message.firstTokenAt - message.generationStartedAt
        : null;
    const isCached = ttft !== null && isCachedResponse(ttft);

    // Read attachments from local cache (instant)
    // Cache is synced by useMetadataCacheSync in VirtualizedMessageList
    const attachments = useCachedAttachments(
      isTempMessage ? "" : (message._id as string),
    );

    // Fetch URLs for attachments
    const attachmentStorageIds =
      attachments?.map((a: any) => a.storageId) || [];
    const attachmentUrls = useQuery(
      api.files.getAttachmentUrls,
      attachmentStorageIds.length > 0
        ? { storageIds: attachmentStorageIds }
        : "skip",
    );

    const urlMap = new Map<string, string>(
      attachmentUrls
        ?.map((a: any) => [a.storageId, a.url] as [string, string])
        .filter((pair: any): pair is [string, string] => pair[1] !== null) ||
        [],
    );

    // Read tool calls from local cache (instant)
    // Cache is synced by useMetadataCacheSync in VirtualizedMessageList
    const allToolCalls = useCachedToolCalls(
      isTempMessage ? "" : (message._id as string),
    );

    // Split into complete and partial for backward compatibility
    const toolCalls = allToolCalls?.filter((tc: any) => !tc.isPartial);
    const partialToolCalls = allToolCalls?.filter((tc: any) => tc.isPartial);

    // Model recommendation handlers
    const handleModelSwitch = async (modelId: string) => {
      try {
        await updateModel({
          conversationId: message.conversationId,
          model: modelId,
        });
        toast.success(`Switched to ${MODEL_CONFIG[modelId]?.name || modelId}`);
      } catch (error) {
        toast.error("Failed to switch model");
        console.error("[ChatMessage] Model switch error:", error);
      }
    };

    const handleModelPreview = (modelId: string) => {
      // Dispatch event for page-level modal (ModelPreviewModal is at page level)
      const event = new CustomEvent("open-model-preview", {
        detail: { modelId },
      });
      window.dispatchEvent(event);
    };

    // Edit handlers
    const handleEdit = () => {
      setEditedContent(message.content || "");
      setIsEditing(true);
    };

    const handleSaveEdit = async () => {
      try {
        await editMessage({
          messageId: message._id as Id<"messages">,
          content: editedContent,
        });
        setIsEditing(false);
        toast.success("Message updated");
      } catch (error) {
        toast.error("Failed to update message");
        console.error("[ChatMessage] Edit error:", error);
      }
    };

    const handleCancelEdit = () => {
      setIsEditing(false);
      setEditedContent("");
    };

    // Keyboard shortcuts for focused messages
    useMessageKeyboardShortcuts({
      messageId: message._id as Id<"messages">,
      conversationId: message.conversationId,
      content: displayContent,
      isFocused,
      isUser,
      isGenerating,
      readOnly,
      messageRef,
    });

    // User message styling: Very subtle, transparent, glassmorphic
    const userMessageClass = cn(
      "relative rounded-[2rem] rounded-tr-sm",
      "px-5 py-3 sm:px-6 sm:py-4 text-sm sm:text-base leading-relaxed",
      "bg-primary/10 text-foreground backdrop-blur-sm",
      "border border-primary/20",
      "shadow-sm hover:shadow-md",
      "transition-all duration-300",
      "[&_.prose]:text-foreground",
      "font-medium tracking-wide",
    );

    // Assistant message styling: Glassmorphic, clean, distinct
    const assistantMessageClass = cn(
      "relative rounded-[2rem] rounded-tl-sm",
      "px-5 py-3 sm:px-6 sm:py-4 text-sm sm:text-base leading-relaxed",
      "bg-surface-glass border border-surface-glass-border backdrop-blur-xl",
      "shadow-sm hover:shadow-md hover:border-primary/20",
      "transition-all duration-300",
      "[&_.prose]:text-foreground",
    );

    // Wrapper classes handle alignment and max-width
    const wrapperClass = cn(
      "relative group",
      isUser
        ? "ml-auto mr-4 max-w-[90%] sm:max-w-[75%]"
        : "mr-auto ml-4 max-w-[95%] sm:max-w-[85%]",
    );

    return (
      <div
        className={cn(
          "flex w-full mb-10",
          isUser ? "justify-end" : "justify-start",
        )}
      >
        <div className={wrapperClass}>
          <div
            ref={messageRef}
            id={`message-${message._id}`}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              "chat-message",
              isUser ? userMessageClass : assistantMessageClass,
              isFocused && "ring-2 ring-primary/50",
            )}
            data-testid="message"
            data-message-id={message._id}
            data-message-role={message.role}
            data-status={message.status}
            aria-label={`${isUser ? "Your" : "Assistant"} message`}
            aria-keyshortcuts="r b c delete"
          >
            {isError ? (
              <ErrorDisplay error={message.error} />
            ) : (
              <>
                {/* Sender attribution for collaborative conversations */}
                {isCollaborative && senderUser && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/20">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={senderUser.imageUrl} />
                      <AvatarFallback className="text-[10px]">
                        {senderUser.name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground font-medium">
                      {isUser
                        ? senderUser.name || "User"
                        : `Triggered by ${senderUser.name || "User"}`}
                    </span>
                  </div>
                )}

                {/* Reasoning block - only shows when reasoning is active or has content */}
                {/* Don't render for "No Reasoning" - requires thinkingStartedAt or actual reasoning content */}
                {message.role === "assistant" &&
                  (message.reasoning ||
                    message.partialReasoning ||
                    message.thinkingStartedAt) && (
                    <ReasoningBlock
                      reasoning={message.reasoning}
                      partialReasoning={message.partialReasoning}
                      thinkingStartedAt={message.thinkingStartedAt}
                      thinkingCompletedAt={message.thinkingCompletedAt}
                      reasoningTokens={message.reasoningTokens}
                      isThinking={isGenerating && !!message.partialReasoning}
                    />
                  )}

                {/* Edit mode */}
                {isEditing ? (
                  <MessageEditMode
                    editedContent={editedContent}
                    onContentChange={setEditedContent}
                    onSave={handleSaveEdit}
                    onCancel={handleCancelEdit}
                  />
                ) : (
                  <>
                    {/* Inline tool calls and content */}
                    {displayContent ||
                    toolCalls?.length ||
                    partialToolCalls?.length ? (
                      <div data-testid="message-content">
                        <InlineToolCallContent
                          content={displayContent || ""}
                          toolCalls={toolCalls}
                          partialToolCalls={partialToolCalls}
                          isStreaming={isGenerating}
                        />
                      </div>
                    ) : isGenerating ? (
                      <MessageLoadingState
                        isThinkingModel={
                          isThinkingModel && !!message.thinkingStartedAt
                        }
                      />
                    ) : null}
                  </>
                )}

                {/* Canvas document artifact cards (message body, not inside tool calls) */}
                <ArtifactList messageId={message._id as Id<"messages">} />

                {/* Source citations (Phase 2: from normalized tables) */}
                <SourceList messageId={message._id as Id<"messages">} />

                {/* Attachments - don't reserve space, most messages don't have attachments */}
                {attachments && attachments.length > 0 && urlMap.size > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/10">
                    <AttachmentRenderer
                      attachments={attachments}
                      urls={urlMap}
                    />
                  </div>
                )}

                {/* Toggle for consolidated messages - only when responses loaded */}
                {message.isConsolidation &&
                  originalResponses !== undefined &&
                  originalResponses.length > 0 && (
                    <MessageConsolidationToggle
                      originalResponses={originalResponses}
                      showOriginals={showOriginals}
                      onToggle={() => setShowOriginals(!showOriginals)}
                    />
                  )}

                {/* Enhanced status announcements */}
                {!isUser && (
                  <>
                    {/* Generating */}
                    {message.status === "generating" && (
                      <div role="status" aria-live="polite" className="sr-only">
                        {isThinkingModel && message.thinkingStartedAt
                          ? "AI is thinking about your question"
                          : "AI is generating a response"}
                      </div>
                    )}

                    {/* Complete */}
                    {message.status === "complete" && (
                      <div role="status" aria-live="polite" className="sr-only">
                        {ttft && `Response generated in ${formatTTFT(ttft)}`}
                        {message.tokensPerSecond &&
                          ` at ${Math.round(message.tokensPerSecond)} tokens per second`}
                      </div>
                    )}

                    {/* Error - assertive for immediate attention */}
                    {message.status === "error" && (
                      <div
                        role="alert"
                        aria-live="assertive"
                        className="sr-only"
                      >
                        Error generating response: {message.error}
                      </div>
                    )}

                    {/* Stopped */}
                    {message.status === "stopped" && (
                      <div role="status" aria-live="polite" className="sr-only">
                        Generation was stopped by user
                      </div>
                    )}
                  </>
                )}

                {/* Branch indicator */}
                {!readOnly && (
                  <MessageBranchIndicator
                    messageId={message._id as Id<"messages">}
                  />
                )}
                {!readOnly && features.showNotes && (
                  <MessageNotesIndicator
                    messageId={message._id as Id<"messages">}
                  />
                )}

                {/* Status indicator removed - optimistic updates should feel instant */}

                {/* Model and statistics badges - always reserve space to prevent layout shift */}
                {!isUser && (
                  <div className="min-h-[28px]">
                    {(message.status === "complete" ||
                      message.status === "generating" ||
                      message.status === "stopped") &&
                      modelName && (
                        <MessageStatsBadges
                          modelName={modelName}
                          ttft={ttft}
                          isCached={isCached}
                          tokensPerSecond={message.tokensPerSecond}
                          inputTokens={message.inputTokens}
                          outputTokens={message.outputTokens}
                          status={message.status}
                          showStats={showStats}
                        />
                      )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Model Recommendation Banner - cost optimization */}
          {!readOnly &&
            !isUser &&
            message.status === "complete" &&
            conversation?.modelRecommendation &&
            !conversation.modelRecommendation.dismissed && (
              <div className="mt-4">
                <ModelRecommendationBanner
                  recommendation={conversation.modelRecommendation}
                  conversationId={message.conversationId}
                  onSwitch={handleModelSwitch}
                  onPreview={handleModelPreview}
                />
              </div>
            )}

          {/* Action buttons - absolutely positioned, no layout shift */}
          {!isGenerating && (
            <div
              className={cn(
                "absolute z-10",
                isUser ? "right-5 sm:right-6" : "left-5 sm:left-6",
                "-bottom-8",
                "flex justify-end",
                "transition-opacity duration-200 ease-out",
                alwaysShow
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100",
                !alwaysShow &&
                  "pointer-events-none group-hover:pointer-events-auto",
              )}
            >
              <MessageActions
                message={message}
                nextMessage={nextMessage}
                readOnly={readOnly}
                onEdit={isUser ? handleEdit : undefined}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.message._id === next.message._id &&
      prev.message.content === next.message.content &&
      prev.message.partialContent === next.message.partialContent &&
      prev.message.status === next.message.status &&
      prev.message.error === next.message.error &&
      prev.message.reasoning === next.message.reasoning &&
      prev.message.partialReasoning === next.message.partialReasoning &&
      prev.message.thinkingStartedAt === next.message.thinkingStartedAt &&
      prev.message.thinkingCompletedAt === next.message.thinkingCompletedAt &&
      prev.message.isConsolidation === next.message.isConsolidation &&
      prev.nextMessage?.status === next.nextMessage?.status &&
      prev.isCollaborative === next.isCollaborative &&
      prev.senderUser?.name === next.senderUser?.name
    );
  },
);

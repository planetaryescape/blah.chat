"use client";

import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { AlertCircle, ChevronDown, Loader2, Zap } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { getModelConfig } from "@/lib/ai/utils";
import { cn } from "@/lib/utils";
import { formatTTFT, isCachedResponse } from "@/lib/utils/formatMetrics";
import { FeedbackModal } from "../feedback/FeedbackModal";
import { AttachmentRenderer } from "./AttachmentRenderer";
import { ComparisonView } from "./ComparisonView";
import { InlineToolCallContent } from "./InlineToolCallContent";
import { MessageActions } from "./MessageActions";
import { MessageBranchIndicator } from "./MessageBranchIndicator";
import { MessageNotesIndicator } from "./MessageNotesIndicator";
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
  message: Doc<"messages">;
  nextMessage?: Doc<"messages">;
  readOnly?: boolean;
}

export const ChatMessage = memo(
  function ChatMessage({ message, nextMessage, readOnly }: ChatMessageProps) {
    const [showOriginals, setShowOriginals] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const messageRef = useRef<HTMLDivElement>(null);

    const isUser = message.role === "user";
    const isGenerating = ["pending", "generating"].includes(message.status);
    const isError = message.status === "error";

    // Mutations for keyboard shortcuts
    const regenerate = useMutation(api.chat.regenerate);
    const deleteMsg = useMutation(api.chat.deleteMessage);
    const createBookmark = useMutation(api.bookmarks.create);

    const user = useQuery(api.users.getCurrentUser);
    const alwaysShow = user?.preferences?.alwaysShowMessageActions ?? false;

    // Query for original responses if this is a consolidated message
    const originalResponses = useQuery(
      api.messages.getOriginalResponses,
      message.isConsolidation ? { consolidatedMessageId: message._id } : "skip",
    );

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

    // Fetch URLs for attachments
    const attachmentStorageIds =
      message.attachments?.map((a: any) => a.storageId) || [];
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

    // Keyboard shortcuts for focused messages
    useEffect(() => {
      if (!isFocused || readOnly) return;

      const handleKeyDown = async (e: KeyboardEvent) => {
        // Don't interfere with typing
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true"
        ) {
          return;
        }

        const isMod = e.metaKey || e.ctrlKey;

        switch (e.key.toLowerCase()) {
          case "r":
            // Regenerate (assistant messages only, no modifier)
            if (!isUser && !isGenerating && !isMod) {
              e.preventDefault();
              try {
                await regenerate({ messageId: message._id });
                toast.success("Regenerating response...");
              } catch (_error) {
                toast.error("Failed to regenerate");
              }
            }
            break;

          case "b":
            // Bookmark (no modifier)
            if (!isMod) {
              e.preventDefault();
              try {
                await createBookmark({
                  conversationId: message.conversationId,
                  messageId: message._id,
                });
                toast.success("Message bookmarked");
              } catch (_error) {
                toast.error("Failed to bookmark");
              }
            }
            break;

          case "c":
            // Copy (no modifier - Cmd+C is native)
            if (!isMod) {
              e.preventDefault();
              await navigator.clipboard.writeText(displayContent);
              toast.success("Copied to clipboard");
            }
            break;

          case "n":
            // Save as note (no modifier)
            if (!isMod) {
              e.preventDefault();
              const event = new CustomEvent("save-message-as-note", {
                detail: { messageId: message._id },
              });
              window.dispatchEvent(event);
            }
            break;

          case "delete":
          case "backspace":
            // Delete message and focus next
            if (!isMod) {
              e.preventDefault();
              try {
                await deleteMsg({ messageId: message._id });
                // Focus next message sibling
                const nextSibling =
                  messageRef.current?.parentElement?.nextElementSibling?.querySelector(
                    '[tabindex="0"]',
                  ) as HTMLElement;
                nextSibling?.focus();
                toast.success("Message deleted");
              } catch (_error) {
                toast.error("Failed to delete");
              }
            }
            break;
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
      isFocused,
      readOnly,
      isUser,
      isGenerating,
      message._id,
      message.conversationId,
      displayContent,
      regenerate,
      createBookmark,
      deleteMsg,
    ]);

    // User message styling: Very subtle, transparent, glassmorphic
    const userMessageClass = cn(
      "relative ml-auto max-w-[90%] sm:max-w-[75%] rounded-[2rem] rounded-tr-sm",
      "px-5 py-3 sm:px-6 sm:py-4 text-sm sm:text-base leading-relaxed",
      "bg-primary/10 text-foreground backdrop-blur-sm",
      "border border-primary/20",
      "shadow-sm hover:shadow-md",
      "transition-all duration-300",
      "[&_.prose]:text-foreground [&_.prose_code]:bg-muted/50",
      "font-medium tracking-wide",
    );

    // Assistant message styling: Glassmorphic, clean, distinct
    const assistantMessageClass = cn(
      "relative mr-auto max-w-[95%] sm:max-w-[85%] rounded-[2rem] rounded-tl-sm",
      "px-5 py-3 sm:px-6 sm:py-4 text-sm sm:text-base leading-relaxed",
      "bg-surface-glass border border-surface-glass-border backdrop-blur-xl",
      "shadow-sm hover:shadow-md hover:border-primary/20",
      "transition-all duration-300",
      "[&_.prose]:text-foreground",
      "group/assistant",
    );

    return (
      <div
        className={cn(
          "flex w-full mb-10",
          isUser ? "justify-end" : "justify-start",
        )}
      >
        <motion.div
          ref={messageRef}
          id={`message-${message._id}`}
          tabIndex={0}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            "chat-message",
            isUser ? userMessageClass : assistantMessageClass,
            isFocused && "ring-2 ring-primary/50",
          )}
          data-message-id={message._id}
          data-message-role={message.role}
          initial={!isGenerating ? { opacity: 0, y: 20, scale: 0.95 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={
            !isGenerating
              ? {
                  duration: 0.4,
                  ease: [0.2, 0, 0, 1], // Custom ease for "pop" feel
                }
              : { duration: 0 }
          }
          aria-label={`${isUser ? "Your" : "Assistant"} message`}
          aria-keyshortcuts="r b c delete"
        >
          {isError ? (
            <ErrorDisplay error={message.error} />
          ) : (
            <>
              {/* Reasoning block - shows thinking for reasoning models or if reasoning content exists */}
              {message.role === "assistant" &&
                (isThinkingModel ||
                  message.reasoning ||
                  message.partialReasoning) && (
                  <ReasoningBlock
                    reasoning={message.reasoning}
                    partialReasoning={message.partialReasoning}
                    thinkingStartedAt={message.thinkingStartedAt}
                    thinkingCompletedAt={message.thinkingCompletedAt}
                    reasoningTokens={message.reasoningTokens}
                    isThinking={isGenerating && !!message.partialReasoning}
                  />
                )}

              {/* Inline tool calls and content - renders tool calls at their positions */}
              {displayContent ||
              message.toolCalls?.length ||
              message.partialToolCalls?.length ? (
                <InlineToolCallContent
                  content={displayContent || ""}
                  toolCalls={message.toolCalls}
                  partialToolCalls={message.partialToolCalls}
                  isStreaming={isGenerating}
                />
              ) : isGenerating ? (
                isThinkingModel ? (
                  <div className="flex items-center gap-2 h-6 text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>Thinking...</span>
                  </div>
                ) : (
                  <div className="flex gap-1 items-center h-6">
                    <span
                      className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                )
              ) : null}

              {/* Source citations */}
              {message.sources && message.sources.length > 0 && (
                <SourceList sources={message.sources} />
              )}

              {message.attachments &&
                message.attachments.length > 0 &&
                urlMap.size > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/10">
                    <AttachmentRenderer
                      attachments={message.attachments}
                      urls={urlMap}
                    />
                  </div>
                )}

              {/* Toggle for consolidated messages */}
              {message.isConsolidation &&
                originalResponses &&
                originalResponses.length > 0 && (
                  <div className="mt-4 border-t border-border/10 pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowOriginals(!showOriginals)}
                      className="gap-2 text-xs"
                    >
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 transition-transform",
                          showOriginals && "rotate-180",
                        )}
                      />
                      {showOriginals ? "Hide" : "Show"} original{" "}
                      {originalResponses.length} response
                      {originalResponses.length !== 1 ? "s" : ""}
                    </Button>

                    {showOriginals && (
                      <div className="mt-4">
                        <ComparisonView
                          assistantMessages={originalResponses}
                          comparisonGroupId={
                            originalResponses[0]?.comparisonGroupId || ""
                          }
                          showModelNames={true}
                          onVote={() => {}}
                          onConsolidate={() => {}}
                          onToggleModelNames={() => {}}
                          hideConsolidateButton={true}
                        />
                      </div>
                    )}
                  </div>
                )}

              {!isUser &&
                (message.status === "complete" ||
                  message.status === "generating") &&
                modelName && (
                  <div className="absolute -bottom-7 left-4 flex items-center gap-2 transition-opacity duration-300">
                    {/* Model name */}
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 bg-background/50 backdrop-blur border-border/50 text-muted-foreground"
                    >
                      {modelName}
                    </Badge>

                    {/* TTFT badge */}
                    {ttft !== null && (
                      <TooltipProvider>
                        {isCached ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 bg-background/50 backdrop-blur border-border/50 text-muted-foreground"
                              >
                                <Zap className="w-3 h-3 mr-1" />
                                cached
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <div className="font-semibold">
                                  Cached Response
                                </div>
                                <div className="text-muted-foreground">
                                  Served instantly from cache
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] h-5 font-mono tabular-nums cursor-help bg-background/50 backdrop-blur border-border/50 text-muted-foreground",
                                  message.status === "generating" &&
                                    "animate-pulse",
                                )}
                              >
                                TTFT: {formatTTFT(ttft)}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <div className="font-semibold">
                                  Time to First Token
                                </div>
                                <div className="text-muted-foreground">
                                  {message.status === "generating"
                                    ? "AI started responding"
                                    : "How long until AI started responding"}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                    )}

                    {/* TPS badge (completed only) */}
                    {message.tokensPerSecond &&
                      message.status === "complete" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 font-mono tabular-nums cursor-help bg-background/50 backdrop-blur border-border/50 text-muted-foreground"
                              >
                                TPS: {Math.round(message.tokensPerSecond)} t/s
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <div className="font-semibold">
                                  Tokens Per Second
                                </div>
                                <div className="text-muted-foreground">
                                  Generation speed:{" "}
                                  {Math.round(message.tokensPerSecond)}{" "}
                                  tokens/sec
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                    {/* Token count badge */}
                    {(message.inputTokens !== undefined ||
                      message.outputTokens !== undefined) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 font-mono tabular-nums cursor-help bg-background/50 backdrop-blur border-border/50 text-muted-foreground"
                            >
                              {message.inputTokens || 0}/
                              {message.outputTokens || 0}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div className="font-semibold">Token Count</div>
                              <div className="text-muted-foreground">
                                Input:{" "}
                                {message.inputTokens?.toLocaleString() || 0}
                              </div>
                              <div className="text-muted-foreground">
                                Output:{" "}
                                {message.outputTokens?.toLocaleString() || 0}
                              </div>
                              <div className="text-muted-foreground font-semibold mt-1">
                                Total:{" "}
                                {(
                                  (message.inputTokens || 0) +
                                  (message.outputTokens || 0)
                                ).toLocaleString()}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}

              {/* Enhanced status announcements */}
              {!isUser && (
                <>
                  {/* Generating */}
                  {message.status === "generating" && (
                    <div role="status" aria-live="polite" className="sr-only">
                      {isThinkingModel
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
                    <div role="alert" aria-live="assertive" className="sr-only">
                      Error generating response: {message.error}
                    </div>
                  )}
                </>
              )}

              {/* Branch indicator */}
              {!readOnly && <MessageBranchIndicator messageId={message._id} />}
              {!readOnly && <MessageNotesIndicator messageId={message._id} />}

              {!isGenerating && (
                <div
                  className={cn(
                    "mt-2 flex justify-end transition-opacity duration-200",
                    alwaysShow
                      ? "opacity-100"
                      : isUser
                        ? "opacity-0 group-hover:opacity-100"
                        : "opacity-0 group-hover/assistant:opacity-100",
                  )}
                >
                  <MessageActions
                    message={message}
                    nextMessage={nextMessage}
                    readOnly={readOnly}
                  />
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.message._id === next.message._id &&
      prev.message.partialContent === next.message.partialContent &&
      prev.message.status === next.message.status &&
      prev.message.toolCalls === next.message.toolCalls &&
      prev.message.partialToolCalls === next.message.partialToolCalls &&
      prev.nextMessage?.status === next.nextMessage?.status
    );
  },
);

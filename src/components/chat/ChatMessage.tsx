"use client";

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
import { getModelConfig } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import { formatTTFT, isCachedResponse } from "@/lib/utils/formatMetrics";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { AlertCircle, ChevronDown, Loader2, Zap } from "lucide-react";
import { memo, useState } from "react";
import { AttachmentRenderer } from "./AttachmentRenderer";
import { ComparisonView } from "./ComparisonView";
import { MarkdownContent } from "./MarkdownContent";
import { MessageActions } from "./MessageActions";
import { ReasoningBlock } from "./ReasoningBlock";

interface ChatMessageProps {
  message: Doc<"messages">;
  nextMessage?: Doc<"messages">;
  readOnly?: boolean;
}

export const ChatMessage = memo(
  function ChatMessage({ message, nextMessage, readOnly }: ChatMessageProps) {
    const [showOriginals, setShowOriginals] = useState(false);

    const isUser = message.role === "user";
    const isGenerating = ["pending", "generating"].includes(message.status);
    const isError = message.status === "error";

    // @ts-ignore
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
      modelConfig?.supportsThinkingEffort ||
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
          "flex w-full mb-6",
          isUser ? "justify-end" : "justify-start",
        )}
      >
        <motion.div
          className={isUser ? userMessageClass : assistantMessageClass}
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
        >
          {isError ? (
            <div className="flex flex-col gap-3 p-1">
              <div className="flex items-center gap-2 text-amber-500/90 dark:text-amber-400/90">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium text-sm">
                  Unable to generate response
                </span>
              </div>
              <div className="bg-muted/30 rounded-md p-3 border border-border/50">
                <p className="font-mono text-[11px] leading-relaxed opacity-80 break-words">
                  {message.error}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Reasoning block - shows thinking for reasoning models */}
              {message.role === "assistant" && (
                <ReasoningBlock
                  reasoning={message.reasoning}
                  partialReasoning={message.partialReasoning}
                  thinkingStartedAt={message.thinkingStartedAt}
                  thinkingCompletedAt={message.thinkingCompletedAt}
                  reasoningTokens={message.reasoningTokens}
                  isThinking={isGenerating && !!message.partialReasoning}
                />
              )}

              {displayContent ? (
                <MarkdownContent
                  content={displayContent}
                  isStreaming={isGenerating}
                />
              ) : isThinkingModel ? (
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
                  <div className="absolute -bottom-5 left-4 flex items-center gap-2 transition-opacity duration-300">
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
                                    "animate-pulse"
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
                  </div>
                )}

              {/* Screen reader announcement */}
              {!isUser && message.status === "complete" && (
                <div className="sr-only" role="status" aria-live="polite">
                  {ttft && `Response generated in ${formatTTFT(ttft)}`}
                  {message.tokensPerSecond &&
                    ` at ${Math.round(message.tokensPerSecond)} tokens per second`}
                </div>
              )}

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
      prev.nextMessage?.status === next.nextMessage?.status
    );
  },
);

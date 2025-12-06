"use client";

import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { getModelConfig } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { memo } from "react";
import { AttachmentRenderer } from "./AttachmentRenderer";
import { MarkdownContent } from "./MarkdownContent";
import { MessageActions } from "./MessageActions";

interface ChatMessageProps {
  message: Doc<"messages">;
  nextMessage?: Doc<"messages">;
  readOnly?: boolean;
}

export const ChatMessage = memo(
  function ChatMessage({ message, nextMessage, readOnly }: ChatMessageProps) {
    const isUser = message.role === "user";
    const isGenerating = ["pending", "generating"].includes(message.status);
    const isError = message.status === "error";

    // @ts-ignore
    const user = useQuery(api.users.getCurrentUser);
    const alwaysShow = user?.preferences?.alwaysShowMessageActions ?? false;

    const displayContent = message.partialContent || message.content || "";
    const modelName = message.model?.split(":")[1] || message.model;

    // Check if this is a thinking/reasoning model
    const modelConfig = message.model ? getModelConfig(message.model) : null;
    const isThinkingModel =
      modelConfig?.supportsThinkingEffort ||
      modelConfig?.capabilities?.includes("extended-thinking") ||
      modelConfig?.capabilities?.includes("thinking") ||
      false;

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


              {!isUser && message.status === "complete" && modelName && (
                <div className="absolute -bottom-5 left-4 opacity-0 group-hover/assistant:opacity-100 transition-opacity duration-300">
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 bg-background/50 backdrop-blur border-border/50 text-muted-foreground"
                  >
                    {modelName}
                  </Badge>
                </div>
              )}

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

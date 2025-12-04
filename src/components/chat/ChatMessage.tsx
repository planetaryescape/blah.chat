"use client";

import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { memo } from "react";
import { AttachmentIndicators } from "./AttachmentIndicators";
import { MarkdownContent } from "./MarkdownContent";
import { MessageActions } from "./MessageActions";

interface ChatMessageProps {
  message: Doc<"messages">;
}

export const ChatMessage = memo(
  function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === "user";
    const isGenerating = ["pending", "generating"].includes(message.status);
    const isError = message.status === "error";

    const user = useQuery(api.users.getCurrentUser);
    const alwaysShow = user?.preferences?.alwaysShowMessageActions ?? false;

    const displayContent = message.partialContent || message.content || "";
    const modelName = message.model?.split(":")[1] || message.model;

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
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.4,
            ease: [0.2, 0, 0, 1], // Custom ease for "pop" feel
          }}
        >
          {isError ? (
            <div className="text-destructive flex flex-col gap-2">
              <div className="flex items-center gap-2 font-display font-bold">
                <AlertCircle className="w-5 h-5" />
                <span>Error Generating Response</span>
              </div>
              <p className="text-sm opacity-90">{message.error}</p>
            </div>
          ) : (
            <>
              {displayContent ? (
                <MarkdownContent
                  content={displayContent}
                  isStreaming={isGenerating}
                />
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

              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/10">
                  <AttachmentIndicators attachments={message.attachments} />
                </div>
              )}

              {isGenerating && (
                <div className="flex items-center gap-2 mt-3 text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span>Thinking...</span>
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
                <MessageActions message={message} />
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
      prev.message.status === next.message.status
    );
  },
);

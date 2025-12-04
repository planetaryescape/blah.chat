"use client";

import { Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MarkdownContent } from "./MarkdownContent";
import { MessageActions } from "./MessageActions";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Doc<"messages">;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isGenerating = ["pending", "generating"].includes(message.status);
  const isError = message.status === "error";

  const displayContent = message.partialContent || message.content || "";
  const modelName = message.model?.split(":")[1] || message.model;

  return (
    <div className={cn("flex group", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3 message-enter [&_.prose]:max-w-none",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border"
        )}
      >
        {isError ? (
          <div className="text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <p className="font-medium">Error</p>
            </div>
            <p className="text-sm mt-1">{message.error}</p>
          </div>
        ) : (
          <>
            {displayContent ? (
              <MarkdownContent content={displayContent} />
            ) : (
              <div className="shimmer h-4 rounded" />
            )}

            {isGenerating && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Generating...</span>
              </div>
            )}

            {!isUser && message.status === "complete" && modelName && (
              <Badge variant="secondary" className="mt-2 text-xs">
                {modelName}
              </Badge>
            )}

            <MessageActions message={message} />
          </>
        )}
      </div>
    </div>
  );
}

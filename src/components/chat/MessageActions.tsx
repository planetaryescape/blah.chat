"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  Copy,
  GitBranch,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookmarkButton } from "./BookmarkButton";

interface MessageActionsProps {
  message: Doc<"messages">;
  nextMessage?: Doc<"messages">;
  readOnly?: boolean;
}

export function MessageActions({
  message,
  nextMessage,
  readOnly,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser as any);
  const regenerate = useMutation(api.chat.regenerate);
  const retryMessage = useMutation(api.chat.retryMessage);
  const deleteMsg = useMutation(api.chat.deleteMessage);
  const stop = useMutation(api.chat.stopGeneration);
  const branchFromMessage = useMutation(api.chat.branchFromMessage);

  const isUser = message.role === "user";
  const isGenerating = ["pending", "generating"].includes(message.status);
  const alwaysShow = user?.preferences?.alwaysShowMessageActions ?? false;
  const shouldShowRetry =
    isUser && nextMessage?.status === "error" && !isGenerating;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      message.content || message.partialContent || "",
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBranch = async () => {
    try {
      const newConversationId = await branchFromMessage({
        messageId: message._id,
      });
      router.push(`/chat/${newConversationId}`);
    } catch (error) {
      console.error("Failed to branch:", error);
    }
  };

  return (
    <div
      className={cn("flex items-center gap-2", "transition-all duration-200")}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Copied!" : "Copy message (C)"}</p>
        </TooltipContent>
      </Tooltip>

      {!readOnly && (
        <>
          {shouldShowRetry && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
                  onClick={() => retryMessage({ messageId: message._id })}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="sr-only">Retry</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Retry message</p>
              </TooltipContent>
            </Tooltip>
          )}

          {!isUser && !isGenerating && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
                  onClick={() => regenerate({ messageId: message._id })}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="sr-only">Regenerate</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Regenerate response (R)</p>
              </TooltipContent>
            </Tooltip>
          )}

          {isGenerating && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
                  onClick={() =>
                    stop({ conversationId: message.conversationId })
                  }
                >
                  <Square className="w-3.5 h-3.5" />
                  <span className="sr-only">Stop</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Stop generation</p>
              </TooltipContent>
            </Tooltip>
          )}

          {!isGenerating && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
                  onClick={handleBranch}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span className="sr-only">Branch</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Branch from this message</p>
              </TooltipContent>
            </Tooltip>
          )}

          <BookmarkButton
            messageId={message._id}
            conversationId={message.conversationId}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-destructive/20 hover:text-destructive"
                onClick={() => deleteMsg({ messageId: message._id })}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="sr-only">Delete</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete message (Delete)</p>
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}

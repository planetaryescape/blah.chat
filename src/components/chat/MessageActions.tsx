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

interface MessageActionsProps {
  message: Doc<"messages">;
}

export function MessageActions({ message }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);
  const regenerate = useMutation(api.chat.regenerate);
  const deleteMsg = useMutation(api.chat.deleteMessage);
  const stop = useMutation(api.chat.stopGeneration);
  const branchFromMessage = useMutation(api.chat.branchFromMessage);

  const isUser = message.role === "user";
  const isGenerating = ["pending", "generating"].includes(message.status);
  const alwaysShow = user?.preferences?.alwaysShowMessageActions ?? false;

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
      className={cn("flex items-center gap-1", "transition-all duration-200")}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-background/20 hover:text-foreground"
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
          <p>{copied ? "Copied!" : "Copy message"}</p>
        </TooltipContent>
      </Tooltip>

      {!isUser && !isGenerating && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-background/20 hover:text-foreground"
              onClick={() => regenerate({ messageId: message._id })}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="sr-only">Regenerate</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Regenerate response</p>
          </TooltipContent>
        </Tooltip>
      )}

      {isGenerating && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-background/20 hover:text-foreground"
              onClick={() => stop({ conversationId: message.conversationId })}
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
              className="h-6 w-6 p-0 hover:bg-background/20 hover:text-foreground"
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

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
            onClick={() => deleteMsg({ messageId: message._id })}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete message</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

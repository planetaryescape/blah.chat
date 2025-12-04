"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, RotateCcw, Trash2, Square, GitBranch } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
      message.content || message.partialContent || ""
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
      className={cn(
        "flex items-center gap-1 mt-2 transition-all duration-200",
        alwaysShow ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="w-3 h-3 mr-1" />
        ) : (
          <Copy className="w-3 h-3 mr-1" />
        )}
        {copied ? "Copied" : "Copy"}
      </Button>

      {!isUser && !isGenerating && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => regenerate({ messageId: message._id })}
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Regenerate
        </Button>
      )}

      {isGenerating && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => stop({ conversationId: message.conversationId })}
        >
          <Square className="w-3 h-3 mr-1" />
          Stop
        </Button>
      )}

      {!isGenerating && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={handleBranch}
          title="Branch from this message"
        >
          <GitBranch className="w-3 h-3 mr-1" />
          Branch
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-destructive"
        onClick={() => deleteMsg({ messageId: message._id })}
      >
        <Trash2 className="w-3 h-3 mr-1" />
        Delete
      </Button>
    </div>
  );
}

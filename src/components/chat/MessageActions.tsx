"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, RotateCcw, Trash2, Square } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

interface MessageActionsProps {
  message: Doc<"messages">;
}

export function MessageActions({ message }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const regenerate = useMutation(api.chat.regenerate);
  const deleteMsg = useMutation(api.chat.deleteMessage);
  const stop = useMutation(api.chat.stopGeneration);

  const isUser = message.role === "user";
  const isGenerating = ["pending", "generating"].includes(message.status);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      message.content || message.partialContent || ""
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
      {!isUser && !isGenerating && (
        <>
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

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => regenerate({ messageId: message._id })}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Regenerate
          </Button>
        </>
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

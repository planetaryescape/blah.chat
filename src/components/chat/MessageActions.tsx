"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  Copy,
  FileText,
  GitBranch,
  RotateCcw,
  Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookmarkButton } from "./BookmarkButton";
import { MessageActionsMenu } from "./MessageActionsMenu";
import { MessageActionsMenuMobile } from "./MessageActionsMenuMobile";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { TTSButton } from "./TTSButton";

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
  const [showCreateNote, setShowCreateNote] = useState(false);
  const router = useRouter();
  // @ts-ignore - Convex type instantiation depth issue
  const user = useQuery(api.users.getCurrentUser as any);
  const retryMessage = useMutation(api.chat.retryMessage);
  const stop = useMutation(api.chat.stopGeneration);
  const regenerate = useMutation(api.chat.regenerate);
  const branchFromMessage = useMutation(api.chat.branchFromMessage);
  const { isMobile } = useMobileDetect();

  const isUser = message.role === "user";
  const isGenerating = ["pending", "generating"].includes(message.status);
  const alwaysShow = user?.preferences?.alwaysShowMessageActions ?? false;
  const ttsEnabled = user?.preferences?.ttsEnabled ?? false;
  const shouldShowRetry =
    isUser && nextMessage?.status === "error" && !isGenerating;

  // Listen for keyboard shortcut to trigger save as note
  useEffect(() => {
    const handleSaveAsNote = (e: Event) => {
      const customEvent = e as CustomEvent<{ messageId: string }>;
      if (customEvent.detail.messageId === message._id) {
        setShowCreateNote(true);
      }
    };

    window.addEventListener("save-message-as-note", handleSaveAsNote);
    return () => {
      window.removeEventListener("save-message-as-note", handleSaveAsNote);
    };
  }, [message._id]);

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

  const handleRegenerate = async () => {
    try {
      await regenerate({ messageId: message._id });
    } catch (error) {
      console.error("Failed to regenerate:", error);
    }
  };

  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);

  const handleBookmark = () => {
    setBookmarkDialogOpen(true);
  };

  // Mobile: Single menu with all actions
  if (isMobile && !readOnly) {
    return (
      <>
        <div className="flex items-center gap-2">
          <MessageActionsMenuMobile
            message={message}
            isGenerating={isGenerating}
            isUser={isUser}
            onCopy={handleCopy}
            onSaveAsNote={() => setShowCreateNote(true)}
            onBookmark={handleBookmark}
          />
        </div>

        <CreateNoteDialog
          open={showCreateNote}
          onOpenChange={setShowCreateNote}
          initialContent={message.content || message.partialContent || ""}
          sourceMessageId={message._id}
          sourceConversationId={message.conversationId}
        />

        <BookmarkButton
          messageId={message._id}
          conversationId={message.conversationId}
        />
      </>
    );
  }

  // Desktop: Visible buttons + overflow menu
  return (
    <>
      <div
        className={cn("flex items-center gap-2", "transition-all duration-200")}
      >
        {/* Copy Button */}
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
            {/* Conditional: Retry or Stop */}
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

            {/* Bookmark Button */}
            <BookmarkButton
              messageId={message._id}
              conversationId={message.conversationId}
            />

            {/* Save as Note Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
                  onClick={() => setShowCreateNote(true)}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="sr-only">Save as Note</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save as note (N)</p>
              </TooltipContent>
            </Tooltip>

            {/* Branch Button */}
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
                <p>Branch conversation (B)</p>
              </TooltipContent>
            </Tooltip>

            {/* Regenerate Button - only for assistant messages when not generating */}
            {!isUser && !isGenerating && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
                    onClick={handleRegenerate}
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

            {/* TTS Button - only for complete assistant messages when TTS is enabled */}
            {!isUser &&
              message.status === "complete" &&
              ttsEnabled &&
              (message.content || message.partialContent) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TTSButton
                      text={message.content || message.partialContent || ""}
                      messageId={message._id}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Play with text-to-speech</p>
                  </TooltipContent>
                </Tooltip>
              )}

            {/* Overflow Menu (Delete only now) */}
            <MessageActionsMenu
              message={message}
              isGenerating={isGenerating}
              isUser={isUser}
            />
          </>
        )}
      </div>

      {/* CreateNoteDialog */}
      <CreateNoteDialog
        open={showCreateNote}
        onOpenChange={setShowCreateNote}
        initialContent={message.content || message.partialContent || ""}
        sourceMessageId={message._id}
        sourceConversationId={message.conversationId}
      />
    </>
  );
}

"use client";

import {
  Check,
  Copy,
  FileText,
  GitBranch,
  Pencil,
  RotateCcw,
  Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCachedSources } from "@/hooks/useCacheSync";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useHaptic } from "@/hooks/useHaptic";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { requestMessagesRefetch } from "@/hooks/useRestMessageSync";
import { useUserPreference } from "@/hooks/useUserPreference";
import { useApiClient } from "@/lib/api/client";
import { useRegenerateMessage } from "@/lib/hooks/mutations/useRegenerateMessage";
import { cn } from "@/lib/utils";
import type { OptimisticMessage } from "@/types/optimistic";
import { BookmarkButton } from "./BookmarkButton";
import { MessageActionsMenu } from "./MessageActionsMenu";
import { MessageActionsMenuMobile } from "./MessageActionsMenuMobile";
import { QuickModelSwitcher } from "./QuickModelSwitcher";
import { TTSButton } from "./TTSButton";

interface MessageActionsProps {
  message: any | OptimisticMessage;
  nextMessage?: any | OptimisticMessage;
  readOnly?: boolean;
  onEdit?: () => void;
}

export function MessageActions({
  message,
  nextMessage,
  readOnly,
  onEdit,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const router = useRouter();
  const apiClient = useApiClient();
  const regenerate = useRegenerateMessage();
  const sources = useCachedSources(message._id);
  const { isMobile } = useMobileDetect();
  const { haptic } = useHaptic();
  const features = useFeatureToggles();

  const ttsEnabled = useUserPreference("ttsEnabled");

  const isUser = message.role === "user";
  const isGenerating = ["pending", "generating"].includes(message.status);
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

  // Listen for keyboard shortcut to open regenerate model selector
  useEffect(() => {
    const handleOpenRegenerateSelector = (e: Event) => {
      const customEvent = e as CustomEvent<{ messageId: string }>;
      if (
        customEvent.detail.messageId === message._id &&
        !isUser &&
        !isGenerating
      ) {
        setModelSelectorOpen(true);
      }
    };

    window.addEventListener(
      "open-regenerate-model-selector",
      handleOpenRegenerateSelector,
    );
    return () => {
      window.removeEventListener(
        "open-regenerate-model-selector",
        handleOpenRegenerateSelector,
      );
    };
  }, [message._id, isUser, isGenerating]);

  const handleCopy = async () => {
    let text = message.content || message.partialContent || "";

    // Append sources for assistant messages
    if (message.role === "assistant" && sources?.length) {
      text += "\n\n**Sources:**\n";
      for (const src of sources) {
        text += `- [${src.position}] [${src.title || src.url}](${src.url})\n`;
      }
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    haptic("SUCCESS");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBranch = async () => {
    try {
      await apiClient.post(
        `/api/v1/conversations/${message.conversationId}/switch-branch`,
        {
          targetMessageId: message._id,
        },
      );
      requestMessagesRefetch(message.conversationId);
      router.push(`/chat/${message.conversationId}`);
    } catch (error) {
      console.error("Failed to branch:", error);
    }
  };

  const handleRegenerate = async (modelId?: string) => {
    try {
      await regenerate.mutateAsync({
        messageId: message._id as string,
        conversationId: message.conversationId,
        modelId,
      });
    } catch (error) {
      console.error("Failed to regenerate:", error);
    }
  };

  const [_bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);

  const handleBookmark = () => {
    setBookmarkDialogOpen(true);
  };

  const handleSaveAsNoteClick = () => {
    setShowCreateNote(true);
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
            onSaveAsNote={
              features.showNotes ? handleSaveAsNoteClick : undefined
            }
            onBookmark={features.showBookmarks ? handleBookmark : undefined}
          />
        </div>

        <CreateNoteDialog
          open={showCreateNote}
          onOpenChange={setShowCreateNote}
          initialContent={message.content || message.partialContent || ""}
          sourceMessageId={message._id as string}
          sourceConversationId={message.conversationId}
        />

        {features.showBookmarks && (
          <BookmarkButton
            messageId={message._id as string}
            conversationId={message.conversationId}
          />
        )}
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
            {/* Edit Button - only for user messages */}
            {isUser && onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
                    onClick={onEdit}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="sr-only">Edit</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit message (E)</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Conditional: Retry or Stop */}
            {shouldShowRetry && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
                    onClick={() => {
                      if (!nextMessage) {
                        return;
                      }

                      void regenerate.mutateAsync({
                        messageId: nextMessage._id as string,
                        conversationId: message.conversationId,
                      });
                    }}
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
                      apiClient.post(
                        `/api/v1/conversations/${message.conversationId}/stop`,
                      )
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
            {features.showBookmarks && (
              <BookmarkButton
                messageId={message._id as string}
                conversationId={message.conversationId}
              />
            )}

            {/* Save as Note Button */}
            {features.showNotes && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
                    onClick={handleSaveAsNoteClick}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="sr-only">Save as Note</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save as note (N)</p>
                </TooltipContent>
              </Tooltip>
            )}

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
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
                      onClick={() => setModelSelectorOpen(true)}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="sr-only">Regenerate</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Regenerate response (R)</p>
                  </TooltipContent>
                </Tooltip>
                <QuickModelSwitcher
                  open={modelSelectorOpen}
                  onOpenChange={setModelSelectorOpen}
                  currentModel={message.model || ""}
                  onSelectModel={(modelId) => {
                    handleRegenerate(modelId);
                  }}
                  mode="single"
                  showTrigger={false}
                />
              </>
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
        sourceMessageId={message._id as string}
        sourceConversationId={message.conversationId}
      />
    </>
  );
}

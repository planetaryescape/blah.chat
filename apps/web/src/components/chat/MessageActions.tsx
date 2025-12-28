"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  Copy,
  FileText,
  GitBranch,
  Pencil,
  Presentation,
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
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { useUserPreference } from "@/hooks/useUserPreference";
import { cn } from "@/lib/utils";
import type { OptimisticMessage } from "@/types/optimistic";
import { BookmarkButton } from "./BookmarkButton";
import { MessageActionsMenu } from "./MessageActionsMenu";
import { MessageActionsMenuMobile } from "./MessageActionsMenuMobile";
import { QuickModelSwitcher } from "./QuickModelSwitcher";
import { TTSButton } from "./TTSButton";

interface MessageActionsProps {
  message: Doc<"messages"> | OptimisticMessage;
  nextMessage?: Doc<"messages"> | OptimisticMessage;
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
  const retryMessage = useMutation(api.chat.retryMessage);
  const stop = useMutation(api.chat.stopGeneration);
  const regenerate = useMutation(api.chat.regenerate);
  const branchFromMessage = useMutation(api.chat.branchFromMessage);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const recordAction = useMutation(api.usage.mutations.recordAction);
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const sources = useQuery(
    api.sources.operations.getSources,
    message.role === "assistant" && !message._id.startsWith("temp_")
      ? { messageId: message._id as Id<"messages"> }
      : "skip",
  );
  const { isMobile } = useMobileDetect();
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
    setTimeout(() => setCopied(false), 2000);
    recordAction({ actionType: "copy_message", resourceId: message._id });
  };

  const handleBranch = async () => {
    try {
      const newConversationId = await branchFromMessage({
        messageId: message._id as Id<"messages">,
      });
      recordAction({ actionType: "branch_message", resourceId: message._id });
      router.push(`/chat/${newConversationId}`);
    } catch (error) {
      console.error("Failed to branch:", error);
    }
  };

  const handleRegenerate = async (modelId?: string) => {
    try {
      await regenerate({
        messageId: message._id as Id<"messages">,
        modelId,
      });
      recordAction({
        actionType: "regenerate_message",
        resourceId: message._id,
      });
    } catch (error) {
      console.error("Failed to regenerate:", error);
    }
  };

  const handleCreatePresentation = () => {
    recordAction({
      actionType: "create_presentation",
      resourceId: message._id,
    });
    router.push(
      `/slides/new?conversationId=${message.conversationId}&messageId=${message._id}`,
    );
  };

  const [_bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);

  const handleBookmark = () => {
    setBookmarkDialogOpen(true);
  };

  const handleSaveAsNoteClick = () => {
    recordAction({ actionType: "save_as_note", resourceId: message._id });
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
            onCreatePresentation={
              features.showSlides &&
              !isUser &&
              (message.content || message.partialContent)
                ? handleCreatePresentation
                : undefined
            }
          />
        </div>

        <CreateNoteDialog
          open={showCreateNote}
          onOpenChange={setShowCreateNote}
          initialContent={message.content || message.partialContent || ""}
          sourceMessageId={message._id as Id<"messages">}
          sourceConversationId={message.conversationId}
        />

        {features.showBookmarks && (
          <BookmarkButton
            messageId={message._id as Id<"messages">}
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
                    onClick={() =>
                      retryMessage({ messageId: message._id as Id<"messages"> })
                    }
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
            {features.showBookmarks && (
              <BookmarkButton
                messageId={message._id as Id<"messages">}
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

            {/* Create Presentation Button - only for assistant messages with content */}
            {features.showSlides &&
              !isUser &&
              (message.content || message.partialContent) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
                      onClick={handleCreatePresentation}
                    >
                      <Presentation className="w-3.5 h-3.5" />
                      <span className="sr-only">Create Presentation</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create presentation</p>
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
        sourceMessageId={message._id as Id<"messages">}
        sourceConversationId={message.conversationId}
      />
    </>
  );
}

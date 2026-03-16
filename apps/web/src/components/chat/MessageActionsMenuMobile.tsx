"use client";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  Bookmark,
  Copy,
  FileText,
  GitBranch,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApiClient } from "@/lib/api/client";
import { cache } from "@/lib/cache";
import { useRegenerateMessage } from "@/lib/hooks/mutations/useRegenerateMessage";
import type { OptimisticMessage } from "@/types/optimistic";
import { QuickModelSwitcher } from "./QuickModelSwitcher";

interface MessageActionsMenuMobileProps {
  message: Doc<"messages"> | OptimisticMessage;
  isGenerating: boolean;
  isUser: boolean;
  onCopy: () => void;
  onSaveAsNote?: () => void;
  onBookmark?: () => void;
}

export function MessageActionsMenuMobile({
  message,
  isGenerating,
  isUser,
  onCopy,
  onSaveAsNote,
  onBookmark,
}: MessageActionsMenuMobileProps) {
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const router = useRouter();
  const apiClient = useApiClient();
  const regenerate = useRegenerateMessage();

  // Check if this is a temporary optimistic message (not yet persisted)
  const isTempMessage =
    typeof message._id === "string" && message._id.startsWith("temp-");

  const handleRegenerate = async (modelId?: string) => {
    if (isTempMessage) return;
    try {
      await regenerate.mutateAsync({
        messageId: message._id as Id<"messages">,
        conversationId: message.conversationId,
        modelId,
      });
    } catch (error) {
      console.error("Failed to regenerate:", error);
    }
  };

  const handleBranch = async () => {
    if (isTempMessage) return;

    try {
      await apiClient.post(
        `/api/v1/conversations/${message.conversationId}/switch-branch`,
        {
          targetMessageId: message._id,
        },
      );
      router.push(`/chat/${message.conversationId}`);
    } catch (error) {
      console.error("Failed to branch:", error);
    }
  };

  const handleDelete = async () => {
    if (isTempMessage) return;

    try {
      const messageId = message._id as Id<"messages">;

      // Find message group before deleting for focus management
      const messageElement = document.querySelector(
        `[data-message-id="${messageId}"]`,
      );
      const currentGroup = messageElement?.closest("[id^='message-group-']");
      const nextGroup = currentGroup?.nextElementSibling as HTMLElement | null;
      const prevGroup =
        currentGroup?.previousElementSibling as HTMLElement | null;

      await apiClient.delete(`/api/v1/messages/${messageId}`);

      // Clear from local cache (prevents stale data)
      await Promise.all([
        cache.messages.delete(messageId),
        cache.attachments.where("messageId").equals(messageId).delete(),
        cache.toolCalls.where("messageId").equals(messageId).delete(),
        cache.sources.where("messageId").equals(messageId).delete(),
      ]).catch(console.error);

      // Focus next, or prev, or chat input as fallback (WCAG 2.4.3)
      requestAnimationFrame(() => {
        let targetElement: HTMLElement | null = null;

        if (nextGroup && document.body.contains(nextGroup)) {
          targetElement = nextGroup;
        } else if (prevGroup && document.body.contains(prevGroup)) {
          targetElement = prevGroup;
        }

        if (targetElement) {
          targetElement.setAttribute("tabindex", "-1");
          targetElement.focus();
        } else {
          // Fallback to chat input
          const chatInput = document.getElementById(
            "chat-input",
          ) as HTMLElement | null;
          chatInput?.focus();
        }
      });
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Actions</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-48">
          {/* Copy */}
          <DropdownMenuItem onClick={onCopy}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Copy</span>
          </DropdownMenuItem>

          {/* Bookmark */}
          {onBookmark && (
            <DropdownMenuItem onClick={onBookmark}>
              <Bookmark className="mr-2 h-4 w-4" />
              <span>Bookmark</span>
            </DropdownMenuItem>
          )}

          {/* Save as Note */}
          {onSaveAsNote && (
            <DropdownMenuItem onClick={onSaveAsNote}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Save as Note</span>
            </DropdownMenuItem>
          )}

          {/* Separator after optional actions */}
          {(onBookmark || onSaveAsNote) && <DropdownMenuSeparator />}

          {/* Regenerate - only for assistant messages when not generating and not temp */}
          {!isUser && !isGenerating && !isTempMessage && (
            <>
              <DropdownMenuItem onClick={() => setModelSelectorOpen(true)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                <span>Regenerate</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Branch - only for persisted messages */}
          {!isTempMessage && (
            <>
              <DropdownMenuItem onClick={handleBranch}>
                <GitBranch className="mr-2 h-4 w-4" />
                <span>Branch conversation</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Delete */}
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <QuickModelSwitcher
        open={modelSelectorOpen}
        onOpenChange={setModelSelectorOpen}
        currentModel={message.model || ""}
        onSelectModel={(modelId) => {
          void handleRegenerate(modelId);
        }}
        mode="single"
        showTrigger={false}
      />
    </>
  );
}

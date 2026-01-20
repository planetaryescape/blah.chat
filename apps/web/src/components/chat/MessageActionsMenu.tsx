"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHaptic } from "@/hooks/useHaptic";
import { analytics } from "@/lib/analytics";
import { cache } from "@/lib/cache";
import type { OptimisticMessage } from "@/types/optimistic";

interface MessageActionsMenuProps {
  message: Doc<"messages"> | OptimisticMessage;
  isGenerating: boolean;
  isUser: boolean;
}

export function MessageActionsMenu({ message }: MessageActionsMenuProps) {
  // Check if this is a temporary optimistic message (not yet persisted)
  // Early return before hooks - isTempMessage is pure prop computation
  const isTempMessage =
    typeof message._id === "string" && message._id.startsWith("temp-");
  if (isTempMessage) return null;

  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const deleteMsg = useMutation(api.chat.deleteMessage);
  const { haptic } = useHaptic();

  const handleDelete = async () => {
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

      haptic("HEAVY");
      await deleteMsg({ messageId });

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

      // Track message deletion
      analytics.track("message_deleted", {
        messageId: message._id,
        conversationId: message.conversationId,
      });
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  return (
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
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>More actions</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-48">
        {/* Delete - now the only action in overflow menu */}
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

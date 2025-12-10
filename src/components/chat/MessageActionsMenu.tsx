"use client";

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
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { analytics } from "@/lib/analytics";

interface MessageActionsMenuProps {
  message: Doc<"messages">;
  isGenerating: boolean;
  isUser: boolean;
}

export function MessageActionsMenu({ message }: MessageActionsMenuProps) {
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const deleteMsg = useMutation(api.chat.deleteMessage);

  const handleDelete = async () => {
    try {
      await deleteMsg({ messageId: message._id });

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

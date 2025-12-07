"use client";

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
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { GitBranch, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface MessageActionsMenuProps {
  message: Doc<"messages">;
  isGenerating: boolean;
  isUser: boolean;
}

export function MessageActionsMenu({
  message,
  isGenerating,
  isUser,
}: MessageActionsMenuProps) {
  const router = useRouter();
  const regenerate = useMutation(api.chat.regenerate);
  const deleteMsg = useMutation(api.chat.deleteMessage);
  const branchFromMessage = useMutation(api.chat.branchFromMessage);

  const handleRegenerate = async () => {
    try {
      await regenerate({ messageId: message._id });
    } catch (error) {
      console.error("Failed to regenerate:", error);
    }
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

  const handleDelete = async () => {
    try {
      await deleteMsg({ messageId: message._id });
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
        {/* Regenerate - only for assistant messages when not generating */}
        {!isUser && !isGenerating && (
          <>
            <DropdownMenuItem onClick={handleRegenerate}>
              <RotateCcw className="mr-2 h-4 w-4" />
              <span>Regenerate</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Branch */}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

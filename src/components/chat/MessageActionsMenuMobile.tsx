"use client";

import { useMutation } from "convex/react";
import {
  Bookmark,
  Copy,
  FileText,
  GitBranch,
  MoreHorizontal,
  Presentation,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { OptimisticMessage } from "@/types/optimistic";

interface MessageActionsMenuMobileProps {
  message: Doc<"messages"> | OptimisticMessage;
  isGenerating: boolean;
  isUser: boolean;
  onCopy: () => void;
  onSaveAsNote?: () => void;
  onBookmark?: () => void;
  onCreatePresentation?: () => void;
}

export function MessageActionsMenuMobile({
  message,
  isGenerating,
  isUser,
  onCopy,
  onSaveAsNote,
  onBookmark,
  onCreatePresentation,
}: MessageActionsMenuMobileProps) {
  const router = useRouter();
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const regenerate = useMutation(api.chat.regenerate);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const deleteMsg = useMutation(api.chat.deleteMessage);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const branchFromMessage = useMutation(api.chat.branchFromMessage);

  const handleRegenerate = async () => {
    try {
      await regenerate({ messageId: message._id as Id<"messages"> });
    } catch (error) {
      console.error("Failed to regenerate:", error);
    }
  };

  const handleBranch = async () => {
    try {
      const newConversationId = await branchFromMessage({
        messageId: message._id as Id<"messages">,
      });
      router.push(`/chat/${newConversationId}`);
    } catch (error) {
      console.error("Failed to branch:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMsg({ messageId: message._id as Id<"messages"> });
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

        {/* Create Presentation */}
        {onCreatePresentation && (
          <DropdownMenuItem onClick={onCreatePresentation}>
            <Presentation className="mr-2 h-4 w-4" />
            <span>Create Presentation</span>
          </DropdownMenuItem>
        )}

        {/* Separator after optional actions */}
        {(onBookmark || onSaveAsNote || onCreatePresentation) && (
          <DropdownMenuSeparator />
        )}

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

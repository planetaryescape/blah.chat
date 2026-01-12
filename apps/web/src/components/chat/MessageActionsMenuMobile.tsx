"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
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
import { cache } from "@/lib/cache";
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
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const regenerate = useMutation(api.chat.regenerate);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const deleteMsg = useMutation(api.chat.deleteMessage);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const branchFromMessage = useMutation(api.chat.branchFromMessage);

  // Check if this is a temporary optimistic message (not yet persisted)
  const isTempMessage =
    typeof message._id === "string" && message._id.startsWith("temp-");

  const handleRegenerate = async (modelId?: string) => {
    if (isTempMessage) return;
    try {
      await regenerate({
        messageId: message._id as Id<"messages">,
        modelId,
      });
    } catch (error) {
      console.error("Failed to regenerate:", error);
    }
  };

  const handleBranch = async () => {
    if (isTempMessage) return;

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
    if (isTempMessage) return;

    try {
      const messageId = message._id as Id<"messages">;
      await deleteMsg({ messageId });

      // Clear from local cache (prevents stale data)
      await Promise.all([
        cache.messages.delete(messageId),
        cache.attachments.where("messageId").equals(messageId).delete(),
        cache.toolCalls.where("messageId").equals(messageId).delete(),
        cache.sources.where("messageId").equals(messageId).delete(),
      ]).catch(console.error);
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
          handleRegenerate(modelId);
        }}
        mode="single"
        showTrigger={false}
      />
    </>
  );
}

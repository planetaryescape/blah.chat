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
import type { Doc } from "@/convex/_generated/dataModel";
import { useConversationActions } from "@/hooks/useConversationActions";
import {
  Archive,
  Edit,
  MoreHorizontal,
  Pin,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { DeleteConversationDialog } from "../sidebar/DeleteConversationDialog";
import { RenameDialog } from "../sidebar/RenameDialog";

interface ConversationHeaderMenuProps {
  conversation: Doc<"conversations">;
}

export function ConversationHeaderMenu({
  conversation,
}: ConversationHeaderMenuProps) {
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const actions = useConversationActions(conversation._id, "header_menu");

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Conversation options</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Conversation options</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowRename(true);
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              actions.handleTogglePin(conversation.pinned);
            }}
          >
            <Pin className="mr-2 h-4 w-4" />
            {conversation.pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              actions.handleToggleStar(conversation.starred);
            }}
          >
            <Star className="mr-2 h-4 w-4" />
            {conversation.starred ? "Unstar" : "Star"}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              actions.handleArchive();
            }}
          >
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              actions.handleAutoRename();
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Auto-rename
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowDelete(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      <RenameDialog
        conversation={conversation}
        open={showRename}
        onOpenChange={setShowRename}
      />

      <DeleteConversationDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={actions.handleDelete}
        conversationTitle={conversation.title}
      />
    </>
  );
}

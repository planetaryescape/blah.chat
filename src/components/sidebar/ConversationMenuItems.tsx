"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { Archive, Edit, Pin, Sparkles, Star, Trash2 } from "lucide-react";
import { ReactNode } from "react";

interface ConversationMenuAction {
  id: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
}

interface GetConversationMenuItemsOptions {
  conversation: Doc<"conversations">;
  onShowRename: () => void;
  onShowDelete: () => void;
  onToggleSelection?: () => void;
  onPin: () => void;
  onStar: () => void;
  onArchive: () => void;
  onAutoRename: () => void;
}

/**
 * Get menu item definitions for conversation actions.
 * Used by both DropdownMenu and ContextMenu.
 */
export function getConversationMenuItems({
  conversation,
  onShowRename,
  onShowDelete,
  onToggleSelection,
  onPin,
  onStar,
  onArchive,
  onAutoRename,
}: GetConversationMenuItemsOptions): ConversationMenuAction[] {
  const cannotPin = !conversation.pinned && conversation.messageCount === 0;

  return [
    {
      id: "rename",
      icon: <Edit className="w-4 h-4 mr-2" />,
      label: "Rename",
      onClick: onShowRename,
    },
    {
      id: "auto-rename",
      icon: <Sparkles className="w-4 h-4 mr-2" />,
      label: "Auto-rename",
      onClick: onAutoRename,
    },
    {
      id: "separator-1",
      icon: null,
      label: "",
      onClick: () => {},
      separator: true,
    },
    ...(onToggleSelection
      ? [
          {
            id: "select",
            icon: (
              <span className="w-4 h-4 mr-2 border border-current rounded-sm" />
            ),
            label: "Select",
            onClick: onToggleSelection,
          },
        ]
      : []),
    {
      id: "pin",
      icon: <Pin className="w-4 h-4 mr-2" />,
      label: conversation.pinned
        ? "Unpin"
        : cannotPin
          ? "Cannot pin empty"
          : "Pin",
      onClick: onPin,
      disabled: cannotPin,
    },
    {
      id: "star",
      icon: <Star className="w-4 h-4 mr-2" />,
      label: conversation.starred ? "Unstar" : "Star",
      onClick: onStar,
    },
    {
      id: "archive",
      icon: <Archive className="w-4 h-4 mr-2" />,
      label: "Archive",
      onClick: onArchive,
    },
    {
      id: "separator-2",
      icon: null,
      label: "",
      onClick: () => {},
      separator: true,
    },
    {
      id: "delete",
      icon: <Trash2 className="w-4 h-4 mr-2" />,
      label: "Delete",
      onClick: onShowDelete,
      destructive: true,
    },
  ];
}

export type { ConversationMenuAction };

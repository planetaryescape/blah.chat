"use client";

import { Edit, Trash2 } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { ChatWidth } from "@/lib/utils/chatWidth";
import { ConversationPreferencesMenu } from "./ConversationPreferencesMenu";
import { ConversationPrimaryActions } from "./ConversationPrimaryActions";

export function ConversationHeaderMenuContent({
  conversation,
  copied,
  currentWidth,
  isCompacting,
  isExtracting,
  showComparisonStats,
  showMessageStats,
  canCompactConversation,
  canExtractMemories,
  onArchive,
  onAutoRename,
  onCompactConversation,
  onCopyConversation,
  onDelete,
  onExtractMemories,
  onRename,
  onToggleComparisonStats,
  onToggleMessageStats,
  onTogglePin,
  onToggleStar,
  onWidthChange,
}: {
  conversation: any;
  copied: boolean;
  currentWidth: ChatWidth;
  isCompacting: boolean;
  isExtracting: boolean;
  showComparisonStats: boolean;
  showMessageStats: boolean;
  canCompactConversation: boolean;
  canExtractMemories: boolean;
  onArchive: () => void;
  onAutoRename: () => void;
  onCompactConversation: () => void;
  onCopyConversation: () => void;
  onDelete: () => void;
  onExtractMemories: () => void;
  onRename: () => void;
  onToggleComparisonStats: (checked: boolean) => void;
  onToggleMessageStats: (checked: boolean) => void;
  onTogglePin: () => void;
  onToggleStar: () => void;
  onWidthChange: (width: ChatWidth) => void;
}) {
  return (
    <DropdownMenuContent align="end" className="w-48">
      <DropdownMenuItem
        onClick={(event) => {
          event.stopPropagation();
          onRename();
        }}
      >
        <Edit className="mr-2 h-4 w-4" />
        Rename
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <ConversationPrimaryActions
        conversation={conversation}
        copied={copied}
        isCompacting={isCompacting}
        isExtracting={isExtracting}
        canCompactConversation={canCompactConversation}
        canExtractMemories={canExtractMemories}
        onArchive={onArchive}
        onAutoRename={onAutoRename}
        onCompactConversation={onCompactConversation}
        onCopyConversation={onCopyConversation}
        onExtractMemories={onExtractMemories}
        onTogglePin={onTogglePin}
        onToggleStar={onToggleStar}
      />

      <DropdownMenuSeparator />

      <ConversationPreferencesMenu
        currentWidth={currentWidth}
        showComparisonStats={showComparisonStats}
        showMessageStats={showMessageStats}
        onToggleComparisonStats={onToggleComparisonStats}
        onToggleMessageStats={onToggleMessageStats}
        onWidthChange={onWidthChange}
      />

      <DropdownMenuSeparator />

      <DropdownMenuItem
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

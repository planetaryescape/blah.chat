"use client";

import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  Archive,
  Brain,
  Check,
  Copy,
  Loader2,
  Pin,
  Shrink,
  Sparkles,
  Star,
} from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function ConversationPrimaryActions({
  conversation,
  copied,
  isCompacting,
  isExtracting,
  canCompactConversation,
  canExtractMemories,
  onArchive,
  onAutoRename,
  onCompactConversation,
  onCopyConversation,
  onExtractMemories,
  onTogglePin,
  onToggleStar,
}: {
  conversation: Doc<"conversations">;
  copied: boolean;
  isCompacting: boolean;
  isExtracting: boolean;
  canCompactConversation: boolean;
  canExtractMemories: boolean;
  onArchive: () => void;
  onAutoRename: () => void;
  onCompactConversation: () => void;
  onCopyConversation: () => void;
  onExtractMemories: () => void;
  onTogglePin: () => void;
  onToggleStar: () => void;
}) {
  return (
    <>
      <DropdownMenuItem
        disabled={!conversation.pinned && conversation.messageCount === 0}
        onClick={(event) => {
          event.stopPropagation();
          onTogglePin();
        }}
      >
        <Pin className="mr-2 h-4 w-4" />
        {conversation.pinned
          ? "Unpin"
          : conversation.messageCount === 0
            ? "Cannot pin empty"
            : "Pin"}
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(event) => {
          event.stopPropagation();
          onToggleStar();
        }}
      >
        <Star className="mr-2 h-4 w-4" />
        {conversation.starred ? "Unstar" : "Star"}
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(event) => {
          event.stopPropagation();
          onArchive();
        }}
      >
        <Archive className="mr-2 h-4 w-4" />
        Archive
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(event) => {
          event.stopPropagation();
          onCopyConversation();
        }}
        disabled={conversation.messageCount === 0}
      >
        {copied ? (
          <Check className="mr-2 h-4 w-4" />
        ) : (
          <Copy className="mr-2 h-4 w-4" />
        )}
        {copied ? "Copied!" : "Copy conversation"}
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(event) => {
          event.stopPropagation();
          onCompactConversation();
        }}
        disabled={isCompacting || !canCompactConversation}
      >
        {isCompacting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Shrink className="mr-2 h-4 w-4" />
        )}
        {isCompacting ? "Compacting..." : "Compact conversation"}
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(event) => {
          event.stopPropagation();
          onAutoRename();
        }}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Auto-rename
      </DropdownMenuItem>

      {canExtractMemories && (
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onExtractMemories();
          }}
          disabled={isExtracting}
        >
          {isExtracting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Brain className="mr-2 h-4 w-4" />
          )}
          {isExtracting ? "Extracting..." : "Extract Memories"}
        </DropdownMenuItem>
      )}
    </>
  );
}

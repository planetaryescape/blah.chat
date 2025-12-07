"use client";

import { Button } from "@/components/ui/button";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { Archive, Edit, MoreVertical, Pin, Star, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteConversationDialog } from "./DeleteConversationDialog";
import { RenameDialog } from "./RenameDialog";

export function ConversationItem({
  conversation,
  index,
  selectedIndex = -1,
  onClearSelection,
}: {
  conversation: Doc<"conversations">;
  index?: number;
  selectedIndex?: number;
  onClearSelection?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showRename, setShowRename] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // @ts-ignore - Convex type inference depth issue
  const deleteConversation = useMutation(api.conversations.deleteConversation);
  // @ts-ignore - Convex type inference depth issue
  const togglePin = useMutation(api.conversations.togglePin);
  // @ts-ignore - Convex type inference depth issue
  const toggleStar = useMutation(api.conversations.toggleStar);
  // @ts-ignore - Convex type inference depth issue
  const archiveConversation = useMutation(api.conversations.archive);

  const isActive = pathname === `/chat/${conversation._id}`;
  const isSelected = index !== undefined && index === selectedIndex;

  const handleClick = () => {
    router.push(`/chat/${conversation._id}`);
  };

  const handleDelete = async () => {
    await deleteConversation({ conversationId: conversation._id });
    if (isActive) {
      router.push("/");
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group flex items-center gap-2 px-2 mx-2 mb-0.5 py-2 sm:py-1 rounded-md cursor-pointer transition-all duration-200",
              "hover:bg-sidebar-accent/50 hover:shadow-none",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm ring-1 ring-sidebar-border/50"
                : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
              isSelected && "bg-primary/10 ring-1 ring-primary",
            )}
            onClick={handleClick}
            onMouseEnter={onClearSelection}
            data-list-index={index}
            role="option"
            aria-selected={isSelected}
            tabIndex={-1}
          >
            <div className="flex-1 truncate">
              <p className="text-sm truncate">
                {conversation.title || "New conversation"}
              </p>
            </div>

            {index !== undefined && index < 9 && (
              <kbd className="h-4 px-1 text-[9px] rounded border border-border/30 bg-background/50 font-mono text-muted-foreground opacity-60">
                ⌘{index + 1}
              </kbd>
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {conversation.starred && (
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              )}
              {conversation.pinned && <Pin className="w-3 h-3 text-primary" />}

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      aria-label="Conversation options"
                    >
                      <MoreVertical className="w-3 h-3" aria-hidden="true" />
                    </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Options</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setShowRename(true);
                  }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        togglePin({ conversationId: conversation._id });
                    }}
                  >
                    <Pin className="w-4 h-4 mr-2" />
                    {conversation.pinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                         e.stopPropagation();
                         toggleStar({ conversationId: conversation._id });
                    }}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    {conversation.starred ? "Unstar" : "Star"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                       e.stopPropagation();
                       archiveConversation({ conversationId: conversation._id });
                    }}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setShowRename(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => togglePin({ conversationId: conversation._id })}>
            <Pin className="w-4 h-4 mr-2" />
            {conversation.pinned ? "Unpin" : "Pin"}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => toggleStar({ conversationId: conversation._id })}>
            <Star className="w-4 h-4 mr-2" />
            {conversation.starred ? "Unstar" : "Star"}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => archiveConversation({ conversationId: conversation._id })}>
            <Archive className="w-4 h-4 mr-2" />
            Archive
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <RenameDialog
        conversation={conversation}
        open={showRename}
        onOpenChange={setShowRename}
      />

      <DeleteConversationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        conversationTitle={conversation.title}
      />
    </>
  );
}

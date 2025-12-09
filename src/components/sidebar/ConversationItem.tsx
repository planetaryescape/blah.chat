import { ProjectBadge } from "@/components/projects/ProjectBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useAction, useMutation } from "convex/react";
import {
  Archive,
  Edit,
  GitBranch,
  MoreVertical,
  Pin,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { DeleteConversationDialog } from "./DeleteConversationDialog";
import { RenameDialog } from "./RenameDialog";

export function ConversationItem({
  conversation,
  index,
  selectedId,
  onClearSelection,
  isSelectionMode = false,
  isSelectedById = false,
  onToggleSelection,
}: {
  conversation: Doc<"conversations">;
  index?: number;
  selectedId?: string | null;
  onClearSelection?: () => void;
  isSelectionMode?: boolean;
  isSelectedById?: boolean;
  onToggleSelection?: (id: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showRename, setShowRename] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectFilter, setProjectFilter] = useQueryState("project");

  // @ts-ignore - Convex type inference depth issue
  const deleteConversation = useMutation(api.conversations.deleteConversation);
  // @ts-ignore - Convex type inference depth issue
  const togglePin = useMutation(api.conversations.togglePin);
  // @ts-ignore - Convex type inference depth issue
  const toggleStar = useMutation(api.conversations.toggleStar);
  // @ts-ignore - Convex type inference depth issue
  const archiveConversation = useMutation(api.conversations.archive);
  // @ts-ignore - Convex type inference depth issue
  const autoRenameAction = useAction(api.conversations.actions.bulkAutoRename);

  const isActive = pathname === `/chat/${conversation._id}`;
  const isSelected = selectedId === conversation._id;

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      onToggleSelection?.(conversation._id);
    } else {
      router.push(`/chat/${conversation._id}`);
    }
  };

  const handleDelete = async () => {
    await deleteConversation({ conversationId: conversation._id });
    if (isActive) {
      router.push("/");
    }
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.(conversation._id);
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePin({ conversationId: conversation._id });
  };

  const handleAutoRename = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      toast.loading("Generating title...", { id: "auto-rename" });
      const results = await autoRenameAction({
        conversationIds: [conversation._id],
      });

      if (results[0]?.success) {
        toast.success("Conversation renamed", { id: "auto-rename" });
      } else {
        throw new Error(results[0]?.error || "Failed to generate title");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to auto-rename";
      toast.error(msg, { id: "auto-rename" });
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group/item relative flex items-center gap-2 px-2 mx-2 mb-0.5 py-2 sm:py-1 rounded-md cursor-pointer transition-all duration-200",
              "hover:bg-sidebar-accent/50 hover:shadow-none",
              isActive && !isSelectionMode
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm ring-1 ring-sidebar-border/50"
                : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
              isSelected &&
                !isSelectionMode &&
                "bg-primary/10 ring-1 ring-primary",
              isSelectedById && "bg-primary/5 ring-1 ring-primary/20",
            )}
            onClick={handleClick}
            onMouseEnter={onClearSelection}
            data-list-id={conversation._id}
            role="option"
            aria-selected={isSelected}
            tabIndex={-1}
          >
            {/* Selection Checkbox (Visible in mode or on hover) */}
            {(isSelectionMode || isSelectedById) && (
              <div className="flex-shrink-0 animate-in fade-in zoom-in duration-200">
                <Checkbox
                  checked={isSelectedById}
                  onCheckedChange={() => onToggleSelection?.(conversation._id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
              </div>
            )}

            {/* Branch indicator button */}
            {!isSelectionMode &&
              conversation.parentConversationId &&
              conversation.parentMessageId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 h-5 w-5 min-w-0 min-h-0 p-0.5 text-muted-foreground/60 hover:text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(
                          `/chat/${conversation.parentConversationId}?messageId=${conversation.parentMessageId}#message-${conversation.parentMessageId}`,
                        );
                      }}
                      aria-label="Go to parent conversation"
                    >
                      <GitBranch className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Branched conversation - click to go to source</p>
                  </TooltipContent>
                </Tooltip>
              )}

            <div className="flex-1 flex items-center gap-2 min-w-0">
              <p
                className={cn(
                  "text-sm truncate flex-1",
                  isSelectedById && "text-primary font-medium",
                )}
              >
                {conversation.title || "New conversation"}
              </p>
              {conversation.projectId && (
                <div className="flex-shrink-0">
                  <ProjectBadge
                    projectId={conversation.projectId}
                    onClick={() => setProjectFilter(conversation.projectId!)}
                    collapsed={projectFilter === conversation.projectId}
                  />
                </div>
              )}
            </div>

            {!isSelectionMode && index !== undefined && index < 9 && (
              <kbd className="h-4 px-1 text-[9px] rounded border border-border/30 bg-background/50 font-mono text-muted-foreground opacity-60">
                ⌘{index + 1}
              </kbd>
            )}

            {/* Status indicators - always visible when present */}
            {(conversation.starred || conversation.pinned) && (
              <div className="flex items-center gap-1">
                {conversation.starred && (
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                )}
                {conversation.pinned && (
                  <Pin className="w-3 h-3 text-primary" />
                )}
              </div>
            )}

            {/* Quick actions + overflow menu - overlay on hover */}
            {!isSelectionMode && (
              <div className="absolute top-2 bottom-2 sm:top-[2.5px] sm:bottom-[2.5px] right-2 flex items-center gap-0 opacity-0 group-hover/item:opacity-100 transition-opacity bg-gradient-to-l from-sidebar-accent via-sidebar-accent/80 to-transparent pl-8 pr-1">
                {/* Select button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSelectClick}
                      variant="ghost"
                      size="icon"
                      className="h-3 w-3 min-w-0 min-h-0 p-0"
                      aria-label="Select conversation"
                    >
                      <div
                        className={cn(
                          "w-2.5 h-2.5 border rounded-sm flex items-center justify-center",
                          isSelectedById
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-current",
                        )}
                      >
                        {isSelectedById && (
                          <span className="text-[8px]">✓</span>
                        )}
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Select</p>
                  </TooltipContent>
                </Tooltip>

                {/* Pin button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handlePinClick}
                      variant="ghost"
                      size="icon"
                      className="h-3 w-3 min-w-0 min-h-0 p-0"
                      aria-label={
                        conversation.pinned
                          ? "Unpin conversation"
                          : "Pin conversation"
                      }
                    >
                      <Pin
                        className={cn(
                          "w-2.5 h-2.5",
                          conversation.pinned && "text-primary fill-primary",
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{conversation.pinned ? "Unpin" : "Pin"}</p>
                  </TooltipContent>
                </Tooltip>

                {/* More options dropdown */}
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-3 w-3 min-w-0 min-h-0 p-0"
                          aria-label="Conversation options"
                        >
                          <MoreVertical
                            className="w-2.5 h-2.5"
                            aria-hidden="true"
                          />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Options</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRename(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAutoRename}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Auto-rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
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
                        archiveConversation({
                          conversationId: conversation._id,
                        });
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
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setShowRename(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={(e) => handleAutoRename(e as any)}>
            <Sparkles className="w-4 h-4 mr-2" />
            Auto-rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onToggleSelection?.(conversation._id)}
          >
            <div className="flex items-center">
              <span className="w-4 h-4 mr-2 border border-current rounded-sm" />
              Select
            </div>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => togglePin({ conversationId: conversation._id })}
          >
            <Pin className="w-4 h-4 mr-2" />
            {conversation.pinned ? "Unpin" : "Pin"}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => toggleStar({ conversationId: conversation._id })}
          >
            <Star className="w-4 h-4 mr-2" />
            {conversation.starred ? "Unstar" : "Star"}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() =>
              archiveConversation({ conversationId: conversation._id })
            }
          >
            <Archive className="w-4 h-4 mr-2" />
            Archive
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => setShowDeleteConfirm(true)}
            className="text-destructive"
          >
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

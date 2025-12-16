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
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { cn } from "@/lib/utils";
import { useAction, useMutation } from "convex/react";
import {
    GitBranch,
    MoreVertical,
    Pin,
    Star,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getConversationMenuItems } from "./ConversationMenuItems";
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
  const features = useFeatureToggles();

  const deleteConversation = useMutation(api.conversations.deleteConversation);
  const togglePin = useMutation(api.conversations.togglePin);
  const toggleStar = useMutation(api.conversations.toggleStar);
  const archiveConversation = useMutation(api.conversations.archive);
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

  const handlePinClick = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await togglePin({ conversationId: conversation._id });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to pin conversation";
      toast.error(message);
    }
  };

  const handleAutoRename = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const handleProjectFilterClick = useCallback(() => {
    if (conversation.projectId) {
      setProjectFilter(conversation.projectId);
    }
  }, [conversation.projectId, setProjectFilter]);

  // Get shared menu items
  const menuItems = getConversationMenuItems({
    conversation,
    onShowRename: () => setShowRename(true),
    onShowDelete: () => setShowDeleteConfirm(true),
    onToggleSelection: onToggleSelection
      ? () => onToggleSelection(conversation._id)
      : undefined,
    onPin: () => handlePinClick(),
    onStar: () => toggleStar({ conversationId: conversation._id }),
    onArchive: () => archiveConversation({ conversationId: conversation._id }),
    onAutoRename: () => handleAutoRename(),
  });

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
              isSelectedById && "bg-primary/5 ring-1 ring-primary/20"
            )}
            onClick={handleClick}
            onMouseEnter={onClearSelection}
            data-list-id={conversation._id}
            role="option"
            aria-selected={isSelected}
            tabIndex={-1}
          >
            {/* Selection Checkbox */}
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

            {/* Branch indicator */}
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
                          `/chat/${conversation.parentConversationId}?messageId=${conversation.parentMessageId}#message-${conversation.parentMessageId}`
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
                  isSelectedById && "text-primary font-medium"
                )}
              >
                {conversation.title || "New conversation"}
              </p>
              {features.showProjects && conversation.projectId && (
                <div className="flex-shrink-0">
                  <ProjectBadge
                    projectId={conversation.projectId}
                    onClick={handleProjectFilterClick}
                    collapsed={projectFilter === conversation.projectId}
                  />
                </div>
              )}
            </div>

            {!isSelectionMode && index !== undefined && index < 9 && (
              <kbd className="hidden sm:inline-flex h-4 px-1 text-[9px] rounded border border-border/30 bg-background/50 font-mono text-muted-foreground opacity-60">
                ⌘{index + 1}
              </kbd>
            )}

            {/* Status indicators */}
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

            {/* Quick actions overlay on hover */}
            {!isSelectionMode && (
              <div className="absolute top-2 bottom-2 sm:top-[2.5px] sm:bottom-[2.5px] right-2 flex items-center gap-0 opacity-0 group-hover/item:opacity-100 transition-opacity bg-gradient-to-l from-sidebar-accent via-sidebar-accent/80 to-transparent pl-8 pr-1">
                {/* Pin button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handlePinClick}
                      variant="ghost"
                      size="icon"
                      className="h-3 w-3 min-w-0 min-h-0 p-0"
                      disabled={
                        !conversation.pinned && conversation.messageCount === 0
                      }
                      aria-label={
                        conversation.pinned ? "Unpin" : "Pin conversation"
                      }
                    >
                      <Pin
                        className={cn(
                          "w-2.5 h-2.5",
                          conversation.pinned && "text-primary fill-primary"
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {conversation.pinned
                        ? "Unpin"
                        : conversation.messageCount === 0
                          ? "Cannot pin empty"
                          : "Pin"}
                    </p>
                  </TooltipContent>
                </Tooltip>

                {/* Dropdown menu */}
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
                          aria-label="Options"
                        >
                          <MoreVertical className="w-2.5 h-2.5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Options</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    {menuItems.map((item) =>
                      item.separator ? (
                        <DropdownMenuSeparator key={item.id} />
                      ) : (
                        <DropdownMenuItem
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            item.onClick();
                          }}
                          disabled={item.disabled}
                          className={item.destructive ? "text-destructive" : ""}
                        >
                          {item.icon}
                          {item.label}
                        </DropdownMenuItem>
                      )
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {menuItems.map((item) =>
            item.separator ? (
              <ContextMenuSeparator key={item.id} />
            ) : (
              <ContextMenuItem
                key={item.id}
                onClick={item.onClick}
                disabled={item.disabled}
                className={item.destructive ? "text-destructive" : ""}
              >
                {item.icon}
                {item.label}
              </ContextMenuItem>
            )
          )}
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

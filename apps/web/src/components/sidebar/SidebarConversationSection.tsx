import { ProjectFilter } from "@/components/projects/ProjectFilter";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { BulkActionBar } from "./BulkActionBar";
import { ConversationList } from "./ConversationList";
import { ConversationListSkeleton } from "./ConversationListSkeleton";

export function SidebarConversationSection({
  conversations,
  conversationsLoading,
  projectFilter,
  selectedId,
  selectedIds,
  showProjects,
  onChangeProjectFilter,
  onClearSelection,
  onClearBulkSelection,
  onDeleteSelection,
  onArchiveSelection,
  onPinSelection,
  onStarSelection,
  onAutoRenameSelection,
  onToggleSelection,
}: {
  conversations: any[];
  conversationsLoading: boolean;
  projectFilter: string | null;
  selectedId: string | null;
  selectedIds: string[];
  showProjects: boolean;
  onChangeProjectFilter: (value: string | null) => void;
  onClearSelection: () => void;
  onClearBulkSelection: () => void;
  onDeleteSelection: () => void;
  onArchiveSelection: () => void;
  onPinSelection: () => void;
  onStarSelection: () => void;
  onAutoRenameSelection: () => void;
  onToggleSelection: (id: string) => void;
}) {
  return (
    <SidebarContent className="flex flex-col gap-0">
      <SidebarGroup className="group-data-[collapsible=icon]:hidden shrink-0 py-0">
        <SidebarGroupLabel>Conversations</SidebarGroupLabel>
        {showProjects && (
          <ProjectFilter
            value={projectFilter}
            onChange={onChangeProjectFilter}
          />
        )}
      </SidebarGroup>

      <div className="flex-1 min-h-0 overflow-hidden">
        <SidebarGroup className="group-data-[collapsible=icon]:hidden h-full pt-0">
          <SidebarGroupContent className="h-full overflow-y-auto">
            {conversationsLoading ? (
              <ConversationListSkeleton />
            ) : (
              <>
                {selectedIds.length > 0 && (
                  <div className="sticky top-0 z-10 px-2 pb-2 bg-sidebar">
                    <BulkActionBar
                      selectedCount={selectedIds.length}
                      onClearSelection={onClearBulkSelection}
                      onDelete={onDeleteSelection}
                      onArchive={onArchiveSelection}
                      onPin={onPinSelection}
                      onUnpin={() => {}}
                      onStar={onStarSelection}
                      onUnstar={() => {}}
                      onAutoRename={onAutoRenameSelection}
                      className="w-full border shadow-sm"
                    />
                  </div>
                )}
                <ConversationList
                  conversations={conversations}
                  selectedId={selectedId}
                  onClearSelection={onClearSelection}
                  selectedIds={selectedIds}
                  onToggleSelection={onToggleSelection}
                />
                <div className="mt-2">
                  <div className="px-2 pb-2 text-[10px] text-muted-foreground hidden sm:block">
                    Tip: Right-click to select
                  </div>
                  <kbd className="hidden sm:inline-flex px-2 text-[9px] opacity-60">
                    ⌘1,⌘2... to jump to conversations
                  </kbd>
                </div>
              </>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    </SidebarContent>
  );
}

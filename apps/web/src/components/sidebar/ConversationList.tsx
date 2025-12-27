import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { ConversationItem } from "./ConversationItem";

export function ConversationList({
  conversations,
  selectedId = null,
  onClearSelection,
  selectedIds = [],
  onToggleSelection,
}: {
  conversations: Doc<"conversations">[];
  selectedId?: string | null;
  onClearSelection?: () => void;
  selectedIds?: string[];
  onToggleSelection?: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  const isSelectionMode = selectedIds && selectedIds.length > 0;

  return (
    <div
      role="listbox"
      aria-label="Conversations"
      aria-activedescendant={selectedId ? `conv-${selectedId}` : undefined}
      tabIndex={0}
    >
      {conversations.map((conversation: any) => (
        <ConversationItem
          key={conversation._id}
          conversation={conversation}
          selectedId={selectedId}
          onClearSelection={onClearSelection}
          isSelectionMode={isSelectionMode}
          isSelectedById={selectedIds?.includes(conversation._id)}
          onToggleSelection={onToggleSelection}
        />
      ))}
    </div>
  );
}

import { ConversationItem } from "./ConversationItem";

const EMPTY_IDS: string[] = [];

export function ConversationList({
  conversations,
  selectedId = null,
  onClearSelection,
  selectedIds = EMPTY_IDS,
  onToggleSelection,
}: {
  conversations: any[];
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
      className="py-2 space-y-0.5"
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

import type { Doc } from "@/convex/_generated/dataModel";
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
      className="py-2"
      role="listbox"
      aria-label="Conversations"
      aria-activedescendant={selectedId ? `conv-${selectedId}` : undefined}
    >
      {conversations.map((conversation: any, index: number) => (
        <ConversationItem
          key={conversation._id}
          conversation={conversation}
          index={index}
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

import type { Doc } from "@/convex/_generated/dataModel";
import { ConversationItem } from "./ConversationItem";

export function ConversationList({
  conversations,
  selectedIndex = -1,
  onClearSelection,
  selectedIds = [],
  onToggleSelection,
}: {
  conversations: Doc<"conversations">[];
  selectedIndex?: number;
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
      aria-activedescendant={
        selectedIndex >= 0
          ? `conv-${conversations[selectedIndex]?._id}`
          : undefined
      }
    >
      {conversations.map((conversation: any, index: number) => (
        <ConversationItem
          key={conversation._id}
          conversation={conversation}
          index={index}
          selectedIndex={selectedIndex}
          onClearSelection={onClearSelection}
          isSelectionMode={isSelectionMode}
          isSelectedById={selectedIds?.includes(conversation._id)}
          onToggleSelection={onToggleSelection}
        />
      ))}
    </div>
  );
}

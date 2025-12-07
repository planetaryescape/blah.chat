import { ConversationItem } from "./ConversationItem";
import type { Doc } from "@/convex/_generated/dataModel";

export function ConversationList({
  conversations,
  selectedIndex = -1,
  onClearSelection,
}: {
  conversations: Doc<"conversations">[];
  selectedIndex?: number;
  onClearSelection?: () => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No conversations yet
      </div>
    );
  }

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
        />
      ))}
    </div>
  );
}

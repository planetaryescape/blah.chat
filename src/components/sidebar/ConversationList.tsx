import { ConversationItem } from "./ConversationItem";
import type { Doc } from "@/convex/_generated/dataModel";

export function ConversationList({
  conversations,
}: {
  conversations: Doc<"conversations">[];
}) {
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="py-2">
      {conversations.map((conversation: any) => (
        <ConversationItem key={conversation._id} conversation={conversation} />
      ))}
    </div>
  );
}

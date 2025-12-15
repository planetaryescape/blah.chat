"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { Command } from "cmdk";
import type { LucideIcon } from "lucide-react";

interface CommandConversationGroupProps {
  heading: string;
  conversations: Doc<"conversations">[];
  icon: LucideIcon;
  onSelect: (conversationId: string) => void;
  className?: string;
}

/**
 * Renders a group of conversation items in the command palette.
 */
export function CommandConversationGroup({
  heading,
  conversations,
  icon: Icon,
  onSelect,
  className,
}: CommandConversationGroupProps) {
  if (conversations.length === 0) return null;

  return (
    <Command.Group
      heading={heading}
      className={`px-2 pb-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mt-2 ${className || ""}`}
    >
      {conversations.map((conv) => (
        <Command.Item
          key={conv._id}
          value={conv._id}
          onSelect={() => onSelect(`/chat/${conv._id}`)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
        >
          <Icon className="h-4 w-4 opacity-70" />
          <span className="truncate">{conv.title}</span>
        </Command.Item>
      ))}
    </Command.Group>
  );
}

"use client";

import { Command } from "cmdk";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  shortcut?: string;
  destructive?: boolean;
}

interface CommandActionGroupProps {
  heading: string;
  actions: ActionItem[];
  className?: string;
}

/**
 * Renders a group of action items in the command palette.
 */
export function CommandActionGroup({
  heading,
  actions,
  className,
}: CommandActionGroupProps) {
  if (actions.length === 0) return null;

  return (
    <Command.Group
      heading={heading}
      className={cn(
        "px-2 pb-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider",
        className,
      )}
    >
      {actions.map((action) => (
        <Command.Item
          key={action.id}
          value={action.id}
          onSelect={action.onSelect}
          className={cn(
            "flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors",
            action.destructive &&
              "text-destructive aria-selected:text-destructive",
          )}
          aria-keyshortcuts={action.shortcut}
        >
          <action.icon className="h-4 w-4" />
          <span>{action.label}</span>
          {action.shortcut && (
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              {action.shortcut}
            </kbd>
          )}
        </Command.Item>
      ))}
    </Command.Group>
  );
}

"use client";

import type {
  ChatComposerCommandDefinition,
  ChatComposerCommandId,
} from "@blah-chat/chat-ui-core/commands";
import { ArrowLeftRight, Braces, Sparkles, Zap } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const COMMAND_ICONS: Record<ChatComposerCommandId, typeof Braces> = {
  model: Sparkles,
  think: Zap,
  template: Braces,
  compare: ArrowLeftRight,
};

interface ChatInputSlashMenuProps {
  open: boolean;
  commands: ChatComposerCommandDefinition[];
  selectedCommandId: ChatComposerCommandId | null;
  onSelect: (command: ChatComposerCommandDefinition) => void;
}

export function ChatInputSlashMenu({
  open,
  commands,
  selectedCommandId,
  onSelect,
}: ChatInputSlashMenuProps) {
  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <div className="absolute left-0 top-0 h-0 w-0" />
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        className="w-72 p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            <CommandEmpty>No commands found.</CommandEmpty>
            <CommandGroup heading="Composer commands">
              {commands.map((command) => {
                const Icon = COMMAND_ICONS[command.id];
                return (
                  <CommandItem
                    key={command.id}
                    value={command.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onSelect={() => onSelect(command)}
                    className={cn(
                      "gap-3",
                      selectedCommandId === command.id &&
                        "bg-accent text-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{command.label}</span>
                      <span className="text-xs text-muted-foreground">
                        /{command.aliases[0]}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

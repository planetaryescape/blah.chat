"use client";

import { HydrationSafeShortcutBadge } from "@/components/chat/HydrationSafeShortcutBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShortcutBadge } from "@/components/ui/shortcut-badge";

interface KeyboardHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  keysAlt?: string[];
  description: string;
  isMod?: boolean;
}

const shortcuts: Record<string, ShortcutItem[]> = {
  "Message Navigation": [
    { keys: ["j"], keysAlt: ["↓"], description: "Next message" },
    { keys: ["k"], keysAlt: ["↑"], description: "Previous message" },
    { keys: ["g", "g"], description: "First message" },
    { keys: ["G"], description: "Last message" },
  ],
  "Chat Actions": [
    { keys: ["i"], keysAlt: ["/"], description: "Focus input" },
    { keys: ["mod", "Enter"], description: "Send message", isMod: true },
    { keys: ["Shift", "Enter"], description: "New line" },
    { keys: ["Alt", "N"], description: "New chat" },
    { keys: ["Shift", "Alt", "N"], description: "New incognito chat" },
  ],
  "Message Actions (when focused)": [
    { keys: ["r"], description: "Regenerate response" },
    { keys: ["c"], description: "Copy to clipboard" },
    { keys: ["b"], description: "Bookmark message" },
    { keys: ["n"], description: "Save as note" },
    { keys: ["Delete"], description: "Delete message" },
  ],
  Navigation: [
    { keys: ["mod", "K"], description: "Command palette", isMod: true },
    { keys: ["mod", "F"], description: "Search", isMod: true },
    { keys: ["mod", "["], description: "Previous conversation", isMod: true },
    { keys: ["mod", "]"], description: "Next conversation", isMod: true },
    {
      keys: ["mod", "1-9"],
      description: "Jump to conversation 1-9",
      isMod: true,
    },
    { keys: ["mod", ","], description: "Settings", isMod: true },
  ],
  "Model & Templates": [
    { keys: ["mod", "J"], description: "Quick model switcher", isMod: true },
    { keys: ["mod", ";"], description: "Quick template switcher", isMod: true },
  ],
  General: [
    { keys: ["?"], description: "Show this help" },
    { keys: ["Esc"], description: "Close dialogs / Clear selection" },
  ],
};

export function KeyboardHelp({ open, onOpenChange }: KeyboardHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6 max-h-[calc(80vh-4rem)]">
          <div className="grid gap-6">
            {Object.entries(shortcuts).map(([category, items]) => (
              <section key={category}>
                <h3 className="font-medium text-sm text-muted-foreground mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm">{item.description}</span>
                      <div className="flex items-center gap-2">
                        {item.isMod ? (
                          <HydrationSafeShortcutBadge keys={item.keys} />
                        ) : (
                          <ShortcutBadge keys={item.keys} />
                        )}
                        {item.keysAlt && (
                          <>
                            <span className="text-xs text-muted-foreground">
                              or
                            </span>
                            <ShortcutBadge keys={item.keysAlt} />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Press <ShortcutBadge keys={["?"]} /> anytime to show this help.
          </p>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

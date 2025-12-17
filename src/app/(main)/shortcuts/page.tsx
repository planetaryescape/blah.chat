"use client";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KEYBOARD_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { getModifierKey } from "@/lib/utils/platform";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

// Helper to parse shortcut string into display parts
function parseShortcut(shortcut: string): string {
  const mod = getModifierKey();
  return shortcut.replace(/Cmd\/Ctrl/g, mod);
}

interface ShortcutItem {
  keys: string;
  description: string;
  category: string;
}

export default function ShortcutsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Flatten shortcuts into searchable list
  const allShortcuts = useMemo(() => {
    const shortcuts: ShortcutItem[] = [];

    for (const [category, items] of Object.entries(KEYBOARD_SHORTCUTS)) {
      for (const [keys, description] of Object.entries(items)) {
        shortcuts.push({
          keys,
          description,
          category: category.charAt(0).toUpperCase() + category.slice(1),
        });
      }
    }

    return shortcuts;
  }, []);

  // Filter shortcuts by search query
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) return allShortcuts;

    const query = searchQuery.toLowerCase();
    return allShortcuts.filter(
      (s) =>
        s.description.toLowerCase().includes(query) ||
        s.keys.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query),
    );
  }, [searchQuery, allShortcuts]);

  // Group filtered shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, ShortcutItem[]> = {};

    for (const shortcut of filteredShortcuts) {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category].push(shortcut);
    }

    return groups;
  }, [filteredShortcuts]);

  const categoryDisplayNames: Record<string, string> = {
    Global: "Global",
    Chat: "Chat Input",
    Messageactions: "Message Actions",
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight">
                Keyboard Shortcuts
              </h1>
              <p className="text-sm text-muted-foreground">
                Work faster with keyboard shortcuts
              </p>
            </div>

            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="text"
                placeholder="Search shortcuts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background border-border/50 focus:bg-background transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          {Object.keys(groupedShortcuts).length === 0 ? (
            <div className="text-center py-24 text-muted-foreground flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold">No shortcuts found</h3>
              <p className="text-sm">No shortcuts match "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                <div key={category}>
                  <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                    {categoryDisplayNames[category] || category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {shortcuts.map((shortcut, index) => (
                      <ShortcutCard
                        key={`${category}-${index}`}
                        keys={shortcut.keys}
                        description={shortcut.description}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ShortcutCard({
  keys,
  description,
}: {
  keys: string;
  description: string;
}) {
  const displayKeys = parseShortcut(keys);

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all">
      <span className="text-sm text-foreground/80">{description}</span>
      <ShortcutBadge keys={displayKeys} />
    </div>
  );
}

function ShortcutBadge({ keys }: { keys: string }) {
  // Split on common separators
  const parts = keys
    .split(/(\s*\+\s*|\s+then\s+|\s*,\s*)/)
    .filter((p) => p.trim() && p !== "+");

  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end">
      {parts.map((part, index) => {
        const trimmed = part.trim();
        // Skip pure separators
        if (trimmed === "+" || trimmed === "then" || trimmed === ",") {
          return (
            <span key={index} className="text-xs text-muted-foreground">
              {trimmed}
            </span>
          );
        }

        return (
          <kbd
            key={index}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-muted/80 border border-border shadow-sm min-w-[2rem] text-center font-mono"
          >
            {trimmed}
          </kbd>
        );
      })}
    </div>
  );
}

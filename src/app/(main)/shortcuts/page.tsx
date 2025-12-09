"use client";

import { Keyboard, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KEYBOARD_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { getModifierKey } from "@/lib/utils/platform";

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
      {/* Background gradients */}
      <div className="fixed inset-0 bg-gradient-radial from-violet-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/60 backdrop-blur-xl border-b border-border/40 shadow-sm transition-all duration-200">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Keyboard className="h-6 w-6" />
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Keyboard Shortcuts
                </h1>
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl">
                Work faster with keyboard shortcuts across blah.chat
              </p>
            </div>

            <div className="flex gap-3 items-center w-full md:w-auto">
              <div className="relative w-full md:w-80 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  type="text"
                  placeholder="Search shortcuts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/50 border-border/50 focus:bg-background transition-all"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Gradient Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-500/5 pointer-events-none" />
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          {Object.keys(groupedShortcuts).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 bg-muted/5 rounded-3xl border border-dashed border-border/50">
              <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center">
                <Search className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-semibold font-display">
                  No shortcuts found
                </h3>
                <p className="text-muted-foreground">
                  No shortcuts match your search "{searchQuery}"
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                <section key={category} className="space-y-4">
                  <h2 className="text-xl font-semibold px-1">
                    {categoryDisplayNames[category] || category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shortcuts.map((shortcut, index) => (
                      <ShortcutCard
                        key={`${category}-${index}`}
                        keys={shortcut.keys}
                        description={shortcut.description}
                      />
                    ))}
                  </div>
                </section>
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
    <div className="flex flex-col justify-between gap-3 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card/80 hover:border-primary/20 hover:shadow-md transition-all duration-200">
      <span className="text-sm font-medium text-foreground/80">
        {description}
      </span>
      <div className="flex justify-end">
        <ShortcutBadge keys={displayKeys} />
      </div>
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

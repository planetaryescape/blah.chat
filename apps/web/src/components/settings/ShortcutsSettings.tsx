"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KEYBOARD_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { getModifierKey } from "@/lib/utils/platform";

function parseShortcut(shortcut: string): string {
  const mod = getModifierKey();
  return shortcut.replace(/Cmd\/Ctrl/g, mod);
}

const ESSENTIAL_KEYS = [
  "Cmd/Ctrl + K",
  "Alt + N",
  "Cmd/Ctrl + J",
  "Cmd/Ctrl + ,",
] as const;

export function ShortcutsSettings() {
  const essentialShortcuts = ESSENTIAL_KEYS.map((key) => ({
    keys: key,
    description:
      KEYBOARD_SHORTCUTS.global[
        key as keyof typeof KEYBOARD_SHORTCUTS.global
      ] ||
      KEYBOARD_SHORTCUTS.chat[key as keyof typeof KEYBOARD_SHORTCUTS.chat] ||
      key,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keyboard Shortcuts</CardTitle>
        <CardDescription>
          Speed up your workflow with keyboard shortcuts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {essentialShortcuts.map((shortcut) => (
            <div
              key={shortcut.keys}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <kbd className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-muted/80 border border-border shadow-sm font-mono">
                {parseShortcut(shortcut.keys)}
              </kbd>
            </div>
          ))}
        </div>
        <Button variant="outline" asChild className="w-full">
          <Link href="/shortcuts">
            View All Shortcuts
            <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

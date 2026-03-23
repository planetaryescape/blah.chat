"use client";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

/**
 * Manager component that activates keyboard shortcuts.
 * Returns null - no UI rendered.
 */
export function KeyboardShortcutsManager() {
  useKeyboardShortcuts();
  return null;
}

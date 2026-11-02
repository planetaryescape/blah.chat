"use client";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

/**
 * Manager component that activates keyboard shortcuts.
 * Must render inside ConversationProvider to access context.
 * Returns null - no UI rendered.
 */
export function KeyboardShortcutsManager() {
  useKeyboardShortcuts();
  return null;
}

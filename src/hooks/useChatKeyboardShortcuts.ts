"use client";

import { useEffect } from "react";

interface UseChatKeyboardShortcutsOptions {
  onOpenQuickSwitcher: () => void;
  onOpenTemplateSelector: () => void;
}

/**
 * Listens for keyboard shortcuts to open quick switchers:
 * - ⌘J: Open quick model switcher
 * - ⌘;: Open quick template switcher
 *
 * Uses custom events dispatched from global keyboard handler.
 */
export function useChatKeyboardShortcuts({
  onOpenQuickSwitcher,
  onOpenTemplateSelector,
}: UseChatKeyboardShortcutsOptions): void {
  // Quick model switcher keyboard shortcut (⌘J)
  useEffect(() => {
    window.addEventListener("open-quick-model-switcher", onOpenQuickSwitcher);
    return () =>
      window.removeEventListener(
        "open-quick-model-switcher",
        onOpenQuickSwitcher,
      );
  }, [onOpenQuickSwitcher]);

  // Quick template switcher keyboard shortcut (⌘;)
  useEffect(() => {
    window.addEventListener(
      "open-quick-template-switcher",
      onOpenTemplateSelector,
    );
    return () =>
      window.removeEventListener(
        "open-quick-template-switcher",
        onOpenTemplateSelector,
      );
  }, [onOpenTemplateSelector]);
}

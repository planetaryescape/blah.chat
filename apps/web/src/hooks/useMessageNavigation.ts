"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseMessageNavigationProps {
  messageCount: number;
  enabled?: boolean;
  onFocusMessage?: (index: number) => void;
}

/**
 * Hook for vim-style j/k navigation between messages.
 *
 * Shortcuts:
 * - j / ArrowDown: Next message
 * - k / ArrowUp: Previous message
 * - g: First message
 * - G (Shift+g): Last message
 */
export function useMessageNavigation({
  messageCount,
  enabled = true,
  onFocusMessage,
}: UseMessageNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const lastKeyRef = useRef<string | null>(null);
  const lastKeyTimeRef = useRef<number>(0);

  const focusMessage = useCallback(
    (index: number) => {
      if (index < 0 || index >= messageCount) return;

      setFocusedIndex(index);

      // Scroll message into view
      const element = document.getElementById(`message-group-${index}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // Focus for screen readers
        element.setAttribute("tabindex", "-1");
        element.focus({ preventScroll: true });
      }

      onFocusMessage?.(index);
    },
    [messageCount, onFocusMessage],
  );

  const navigateUp = useCallback(() => {
    const newIndex = focusedIndex <= 0 ? 0 : focusedIndex - 1;
    focusMessage(newIndex);
  }, [focusedIndex, focusMessage]);

  const navigateDown = useCallback(() => {
    if (messageCount === 0) return;
    const newIndex =
      focusedIndex < 0
        ? 0
        : focusedIndex >= messageCount - 1
          ? messageCount - 1
          : focusedIndex + 1;
    focusMessage(newIndex);
  }, [focusedIndex, messageCount, focusMessage]);

  const navigateToFirst = useCallback(() => {
    if (messageCount > 0) {
      focusMessage(0);
    }
  }, [messageCount, focusMessage]);

  const navigateToLast = useCallback(() => {
    if (messageCount > 0) {
      focusMessage(messageCount - 1);
    }
  }, [messageCount, focusMessage]);

  const clearFocus = useCallback(() => {
    setFocusedIndex(-1);
    lastKeyRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled || messageCount === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      // Skip if modifier keys (except Shift for G)
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const now = Date.now();

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          navigateDown();
          lastKeyRef.current = null;
          break;

        case "k":
        case "ArrowUp":
          e.preventDefault();
          navigateUp();
          lastKeyRef.current = null;
          break;

        case "g":
          e.preventDefault();
          // Check for gg (double g within 500ms)
          if (
            lastKeyRef.current === "g" &&
            now - lastKeyTimeRef.current < 500
          ) {
            navigateToFirst();
            lastKeyRef.current = null;
          } else {
            lastKeyRef.current = "g";
            lastKeyTimeRef.current = now;
          }
          break;

        case "G":
          e.preventDefault();
          navigateToLast();
          lastKeyRef.current = null;
          break;

        case "Escape":
          clearFocus();
          lastKeyRef.current = null;
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    enabled,
    messageCount,
    navigateUp,
    navigateDown,
    navigateToFirst,
    navigateToLast,
    clearFocus,
  ]);

  return {
    focusedIndex,
    focusMessage,
    navigateUp,
    navigateDown,
    navigateToFirst,
    navigateToLast,
    clearFocus,
  };
}

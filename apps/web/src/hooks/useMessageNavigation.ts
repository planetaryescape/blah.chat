"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseMessageNavigationProps {
  /** Number of grouped message items (not raw messages) */
  groupedCount: number;
  enabled?: boolean;
  /** Callback for Virtuoso integration - scrolls to index in virtualized list */
  scrollToIndex?: (index: number) => void;
  /** Whether the list is using virtualization */
  isVirtualized?: boolean;
  onFocusMessage?: (index: number) => void;
}

/**
 * Hook for vim-style j/k navigation between messages.
 *
 * Shortcuts:
 * - j / ArrowDown: Next message
 * - k / ArrowUp: Previous message
 * - g: First message (gg)
 * - G (Shift+g): Last message
 *
 * @param groupedCount - Count of grouped items (from useMessageGrouping), not raw messages
 * @param scrollToIndex - Virtuoso scrollToIndex for virtualized lists
 * @param isVirtualized - Whether virtualization is active
 */
export function useMessageNavigation({
  groupedCount,
  enabled = true,
  scrollToIndex,
  isVirtualized = false,
  onFocusMessage,
}: UseMessageNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const lastKeyRef = useRef<string | null>(null);
  const lastKeyTimeRef = useRef<number>(0);

  const focusMessage = useCallback(
    (index: number) => {
      if (index < 0 || index >= groupedCount) return;

      setFocusedIndex(index);

      // For virtualized lists, use Virtuoso's scrollToIndex
      if (isVirtualized && scrollToIndex) {
        scrollToIndex(index);
        // After scroll, try to focus the element (it should be rendered now)
        requestAnimationFrame(() => {
          const element = document.getElementById(`message-group-${index}`);
          if (element) {
            element.setAttribute("tabindex", "-1");
            element.focus({ preventScroll: true });
          }
        });
      } else {
        // For non-virtualized lists, use DOM-based scroll
        const element = document.getElementById(`message-group-${index}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.setAttribute("tabindex", "-1");
          element.focus({ preventScroll: true });
        }
      }

      onFocusMessage?.(index);
    },
    [groupedCount, isVirtualized, scrollToIndex, onFocusMessage],
  );

  const navigateUp = useCallback(() => {
    const newIndex = focusedIndex <= 0 ? 0 : focusedIndex - 1;
    focusMessage(newIndex);
  }, [focusedIndex, focusMessage]);

  const navigateDown = useCallback(() => {
    if (groupedCount === 0) return;
    const newIndex =
      focusedIndex < 0
        ? 0
        : focusedIndex >= groupedCount - 1
          ? groupedCount - 1
          : focusedIndex + 1;
    focusMessage(newIndex);
  }, [focusedIndex, groupedCount, focusMessage]);

  const navigateToFirst = useCallback(() => {
    if (groupedCount > 0) {
      focusMessage(0);
    }
  }, [groupedCount, focusMessage]);

  const navigateToLast = useCallback(() => {
    if (groupedCount > 0) {
      focusMessage(groupedCount - 1);
    }
  }, [groupedCount, focusMessage]);

  const clearFocus = useCallback(() => {
    setFocusedIndex(-1);
    lastKeyRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled || groupedCount === 0) return;

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
    groupedCount,
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

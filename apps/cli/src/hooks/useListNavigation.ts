/**
 * useListNavigation - Keyboard navigation hook for lists
 *
 * Supports:
 * - Arrow up/down, j/k - Navigate
 * - Enter - Select
 * - Escape, q - Cancel/quit
 * - Page up/down - Jump by page
 */

import { useInput } from "ink";
import { useCallback, useState } from "react";

export interface UseListNavigationOptions<T> {
  items: T[];
  initialIndex?: number;
  pageSize?: number;
  onSelect?: (item: T, index: number) => void;
  onCancel?: () => void;
  onHighlight?: (item: T, index: number) => void;
  isActive?: boolean;
}

export interface UseListNavigationResult<T> {
  selectedIndex: number;
  selectedItem: T | undefined;
  setSelectedIndex: (index: number) => void;
}

export function useListNavigation<T>({
  items,
  initialIndex = 0,
  pageSize = 10,
  onSelect,
  onCancel,
  onHighlight,
  isActive = true,
}: UseListNavigationOptions<T>): UseListNavigationResult<T> {
  const [selectedIndex, setSelectedIndexState] = useState(
    Math.min(initialIndex, Math.max(0, items.length - 1)),
  );

  const setSelectedIndex = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      setSelectedIndexState(clampedIndex);
      if (items[clampedIndex]) {
        onHighlight?.(items[clampedIndex], clampedIndex);
      }
    },
    [items, onHighlight],
  );

  useInput(
    (input, key) => {
      if (items.length === 0) return;

      // Navigation
      if (key.downArrow || input === "j") {
        setSelectedIndex(selectedIndex + 1);
        return;
      }

      if (key.upArrow || input === "k") {
        setSelectedIndex(selectedIndex - 1);
        return;
      }

      // Page navigation
      if (key.pageDown) {
        setSelectedIndex(selectedIndex + pageSize);
        return;
      }

      if (key.pageUp) {
        setSelectedIndex(selectedIndex - pageSize);
        return;
      }

      // Half-page navigation (Ctrl+D/U - vim style)
      const halfPage = Math.floor(pageSize / 2);
      if (key.ctrl && input === "d") {
        setSelectedIndex(selectedIndex + halfPage);
        return;
      }

      if (key.ctrl && input === "u") {
        setSelectedIndex(selectedIndex - halfPage);
        return;
      }

      // Home/End
      if (input === "g" && key.shift) {
        // G = go to end
        setSelectedIndex(items.length - 1);
        return;
      }

      if (input === "g") {
        // gg = go to start (simplified: just g)
        setSelectedIndex(0);
        return;
      }

      // Select
      if (key.return) {
        if (items[selectedIndex]) {
          onSelect?.(items[selectedIndex], selectedIndex);
        }
        return;
      }

      // Cancel
      if (key.escape || input === "q") {
        onCancel?.();
        return;
      }
    },
    { isActive },
  );

  return {
    selectedIndex,
    selectedItem: items[selectedIndex],
    setSelectedIndex,
  };
}

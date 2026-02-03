import { useKeyboard } from "@opentui/solid";
import { createSignal } from "solid-js";

export interface UseListNavigationOptions<T> {
  items: () => T[];
  initialIndex?: number;
  pageSize?: number;
  onSelect?: (item: T, index: number) => void;
  onCancel?: () => void;
  onHighlight?: (item: T, index: number) => void;
  isActive?: () => boolean;
}

export interface UseListNavigationResult<T> {
  selectedIndex: () => number;
  selectedItem: () => T | undefined;
  setSelectedIndex: (index: number) => void;
}

export function useListNavigation<T>({
  items,
  initialIndex = 0,
  pageSize = 10,
  onSelect,
  onCancel,
  onHighlight,
  isActive = () => true,
}: UseListNavigationOptions<T>): UseListNavigationResult<T> {
  const [selectedIndex, setSelectedIndexRaw] = createSignal(
    Math.min(initialIndex, Math.max(0, items().length - 1)),
  );

  const setSelectedIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(index, items().length - 1));
    setSelectedIndexRaw(clamped);
    const item = items()[clamped];
    if (item) onHighlight?.(item, clamped);
  };

  useKeyboard((evt) => {
    if (!isActive()) return;
    const list = items();
    if (list.length === 0) return;

    if (evt.name === "down" || evt.name === "j") {
      evt.preventDefault();
      setSelectedIndex(selectedIndex() + 1);
      return;
    }

    if (evt.name === "up" || evt.name === "k") {
      evt.preventDefault();
      setSelectedIndex(selectedIndex() - 1);
      return;
    }

    if (evt.name === "pagedown") {
      evt.preventDefault();
      setSelectedIndex(selectedIndex() + pageSize);
      return;
    }

    if (evt.name === "pageup") {
      evt.preventDefault();
      setSelectedIndex(selectedIndex() - pageSize);
      return;
    }

    // Ctrl+D / Ctrl+U half-page
    if (evt.ctrl && evt.name === "d") {
      evt.preventDefault();
      setSelectedIndex(selectedIndex() + Math.floor(pageSize / 2));
      return;
    }

    if (evt.ctrl && evt.name === "u") {
      evt.preventDefault();
      setSelectedIndex(selectedIndex() - Math.floor(pageSize / 2));
      return;
    }

    // G = go to end
    if (evt.shift && evt.name === "g") {
      evt.preventDefault();
      setSelectedIndex(list.length - 1);
      return;
    }

    // g = go to start
    if (evt.name === "g") {
      evt.preventDefault();
      setSelectedIndex(0);
      return;
    }

    // Enter = select
    if (evt.name === "return") {
      evt.preventDefault();
      const item = list[selectedIndex()];
      if (item) onSelect?.(item, selectedIndex());
      return;
    }

    // Escape or q = cancel
    if (evt.name === "escape" || evt.name === "q") {
      evt.preventDefault();
      onCancel?.();
      return;
    }
  });

  return {
    selectedIndex,
    selectedItem: () => items()[selectedIndex()],
    setSelectedIndex,
  };
}

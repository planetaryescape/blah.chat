import { useCallback, useEffect, useRef, useState } from "react";

export interface UseListKeyboardNavigationOptions<T> {
  items: T[];
  onSelect: (item: T) => void;
  enabled?: boolean;
  loop?: boolean;
  scrollIntoView?: boolean;
}

export function useListKeyboardNavigation<T>({
  items,
  onSelect,
  enabled = true,
  loop = false,
  scrollIntoView = true,
}: UseListKeyboardNavigationOptions<T>) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const clearSelection = useCallback(() => {
    setSelectedIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || items.length === 0) return;

      // Don't interfere with typing
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      let newIndex = selectedIndex;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          newIndex =
            selectedIndex >= items.length - 1
              ? loop
                ? 0
                : selectedIndex
              : selectedIndex + 1;
          break;

        case "ArrowUp":
          e.preventDefault();
          newIndex =
            selectedIndex <= 0
              ? loop
                ? items.length - 1
                : 0
              : selectedIndex - 1;
          break;

        case "PageDown":
          e.preventDefault();
          newIndex = Math.min(selectedIndex + 10, items.length - 1);
          break;

        case "PageUp":
          e.preventDefault();
          newIndex = Math.max(selectedIndex - 10, 0);
          break;

        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;

        case "End":
          e.preventDefault();
          newIndex = items.length - 1;
          break;

        case "Enter":
          if (selectedIndex >= 0) {
            e.preventDefault();
            onSelect(items[selectedIndex]);
          }
          return;

        case "Escape":
          e.preventDefault();
          clearSelection();
          return;

        default:
          return;
      }

      setSelectedIndex(newIndex);

      // Scroll into view with debounce
      if (scrollIntoView) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          const element = document.querySelector(
            `[data-list-index="${newIndex}"]`,
          );
          element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }, 50);
      }
    },
    [
      items,
      selectedIndex,
      enabled,
      loop,
      onSelect,
      clearSelection,
      scrollIntoView,
    ],
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(scrollTimeoutRef.current);
    };
  }, [handleKeyDown, enabled]);

  return {
    selectedIndex,
    setSelectedIndex,
    clearSelection,
  };
}

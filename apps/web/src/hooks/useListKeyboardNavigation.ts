import { useCallback, useEffect, useRef, useState } from "react";

export interface UseListKeyboardNavigationOptions<T> {
  items: T[];
  onSelect: (item: T) => void;
  enabled?: boolean;
  loop?: boolean;
  scrollIntoView?: boolean;
  getItemId: (item: T) => string;
}

export function useListKeyboardNavigation<T>({
  items,
  onSelect,
  enabled = true,
  loop = false,
  scrollIntoView = true,
  getItemId,
}: UseListKeyboardNavigationOptions<T>) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
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

      // Find current index from selected ID
      const currentIndex = selectedId
        ? items.findIndex((item) => getItemId(item) === selectedId)
        : -1;
      let newIndex = currentIndex;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          newIndex =
            currentIndex >= items.length - 1
              ? loop
                ? 0
                : currentIndex
              : currentIndex + 1;
          break;

        case "ArrowUp":
          e.preventDefault();
          newIndex =
            currentIndex <= 0
              ? loop
                ? items.length - 1
                : 0
              : currentIndex - 1;
          break;

        case "PageDown":
          e.preventDefault();
          newIndex = Math.min(currentIndex + 10, items.length - 1);
          break;

        case "PageUp":
          e.preventDefault();
          newIndex = Math.max(currentIndex - 10, 0);
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
          if (currentIndex >= 0) {
            e.preventDefault();
            onSelect(items[currentIndex]);
          }
          return;

        case "Escape":
          e.preventDefault();
          clearSelection();
          return;

        default:
          return;
      }

      const newItem = items[newIndex];
      if (newItem) {
        const newId = getItemId(newItem);
        setSelectedId(newId);

        // Scroll into view with debounce
        if (scrollIntoView) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = setTimeout(() => {
            const element = document.querySelector(`[data-list-id="${newId}"]`);
            element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }, 50);
        }
      }
    },
    [
      items,
      selectedId,
      enabled,
      loop,
      onSelect,
      clearSelection,
      scrollIntoView,
      getItemId,
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
    selectedId,
    setSelectedId,
    clearSelection,
  };
}

"use client";

import { useMobileDetect } from "@/hooks/useMobileDetect";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface SelectionState {
  text: string;
  rect: DOMRect | null;
  messageId: string;
  messageRole: "user" | "assistant" | "system";
  isActive: boolean;
}

interface SelectionContextValue {
  selection: SelectionState;
  clearSelection: () => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

const EMPTY_SELECTION: SelectionState = {
  text: "",
  rect: null,
  messageId: "",
  messageRole: "user",
  isActive: false,
};

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<SelectionState>(EMPTY_SELECTION);
  const { isMobile } = useMobileDetect();
  const lastSelectionTimeRef = useRef<number>(0);

  const clearSelection = useCallback(() => {
    setSelection(EMPTY_SELECTION);
  }, []);

  const handleSelectionChange = useCallback(() => {
    // Skip on mobile devices - use native selection
    if (isMobile) {
      clearSelection();
      return;
    }

    // Debounce: wait for selection to stabilize
    const timer = setTimeout(() => {
      const windowSelection = window.getSelection();
      const selectedText = windowSelection?.toString().trim();

      // No text selected or selection cleared
      if (
        !selectedText ||
        !windowSelection ||
        windowSelection.rangeCount === 0
      ) {
        clearSelection();
        return;
      }

      // Get the range and its bounding rect
      const range = windowSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Find the closest .chat-message element
      let targetElement = range.commonAncestorContainer;
      if (targetElement.nodeType === Node.TEXT_NODE) {
        targetElement = targetElement.parentElement as Element;
      }

      const messageElement = (targetElement as Element).closest(
        ".chat-message",
      );

      if (!messageElement) {
        // Selection is not within a chat message
        clearSelection();
        return;
      }

      // Extract message metadata from data attributes
      const messageId = messageElement.getAttribute("data-message-id");
      const messageRole = messageElement.getAttribute("data-message-role") as
        | "user"
        | "assistant"
        | "system";

      if (!messageId || !messageRole) {
        clearSelection();
        return;
      }

      // Track selection time
      lastSelectionTimeRef.current = Date.now();

      // Update selection state
      setSelection({
        text: selectedText,
        rect,
        messageId,
        messageRole,
        isActive: true,
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [isMobile, clearSelection]);

  useEffect(() => {
    // Listen to selection changes
    document.addEventListener("selectionchange", handleSelectionChange);

    // Clear selection on mousedown outside (prevents race with mouseup after selection)
    const handleMouseDown = (e: MouseEvent) => {
      if (!selection.isActive) return;

      const timeSinceSelection = Date.now() - lastSelectionTimeRef.current;
      const target = e.target as Element;

      // Ignore if:
      // 1. Click within menu
      // 2. Just completed selection (<100ms ago)
      if (
        target.closest(".selection-context-menu") ||
        timeSinceSelection < 100
      ) {
        return;
      }

      clearSelection();
    };
    document.addEventListener("mousedown", handleMouseDown);

    // Clear selection on scroll (only chat container, not global)
    const handleScroll = (e: Event) => {
      const target = e.target as Element;
      if (selection.isActive && target.closest(".chat-message-list")) {
        clearSelection();
      }
    };
    window.addEventListener("scroll", handleScroll, true); // Capture phase for nested scrolling

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [handleSelectionChange, selection.isActive, clearSelection]);

  return (
    <SelectionContext.Provider value={{ selection, clearSelection }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}

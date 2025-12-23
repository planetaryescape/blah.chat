"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMobileDetect } from "@/hooks/useMobileDetect";

interface SelectionState {
  text: string;
  rect: DOMRect | null;
  mousePosition: { x: number; y: number } | null;
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
  mousePosition: null,
  messageId: "",
  messageRole: "user",
  isActive: false,
};

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<SelectionState>(EMPTY_SELECTION);
  const { isMobile } = useMobileDetect();
  const lastSelectionTimeRef = useRef<number>(0);
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const clearSelection = useCallback(() => {
    setSelection(EMPTY_SELECTION);
    // Clear browser's native text selection
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleSelectionChange = useCallback(
    (mouseEvent: MouseEvent) => {
      // Skip on mobile devices - use native selection
      if (isMobile) {
        clearSelection();
        return;
      }

      // Skip if mouseup was on an input element (preserve focus)
      const target = mouseEvent.target as Element;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.closest("[contenteditable]")
      ) {
        return;
      }

      // Store mouse position immediately
      mousePositionRef.current = {
        x: mouseEvent.clientX,
        y: mouseEvent.clientY,
      };

      // Small delay to ensure selection has stabilized after mouseup
      setTimeout(() => {
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

        // Require minimum 10 characters to show menu (including spaces)
        if (selectedText.length < 10) {
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

        // Update selection state with mouse position
        setSelection({
          text: selectedText,
          rect,
          mousePosition: mousePositionRef.current,
          messageId,
          messageRole,
          isActive: true,
        });
      }, 150); // 150ms delay to stabilize selection after mouseup
    },
    [isMobile, clearSelection],
  );

  useEffect(() => {
    // Listen to mouseup events (only trigger when selection is complete)
    document.addEventListener("mouseup", handleSelectionChange);

    // Clear selection on mousedown outside (prevents race with mouseup after selection)
    const handleMouseDown = (e: MouseEvent) => {
      if (!selection.isActive) return;

      const timeSinceSelection = Date.now() - lastSelectionTimeRef.current;
      const target = e.target as Element;

      // Ignore if:
      // 1. Click within menu or popover
      // 2. Just completed selection (<100ms ago)
      if (
        target.closest(".selection-context-menu") ||
        target.closest(".summarize-popover") ||
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
      document.removeEventListener("mouseup", handleSelectionChange);
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

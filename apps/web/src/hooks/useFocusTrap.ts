"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseFocusTrapOptions {
  enabled?: boolean;
  initialFocus?: "first" | "container" | HTMLElement | null;
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Traps keyboard focus within a container element.
 * Tab cycles through focusable elements, wrapping at edges.
 *
 * Note: Radix UI Dialog already has built-in focus trapping.
 * Use this for custom modal patterns that don't use Radix.
 */
export function useFocusTrap<T extends HTMLElement>({
  enabled = true,
  initialFocus = "first",
}: UseFocusTrapOptions = {}) {
  const containerRef = useRef<T>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => el.offsetParent !== null); // Filter hidden elements
  }, []);

  const focusFirst = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    }
  }, [getFocusableElements]);

  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
    }
  }, [getFocusableElements]);

  // Handle initial focus
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    if (initialFocus === "first") {
      focusFirst();
    } else if (initialFocus === "container") {
      containerRef.current.focus();
    } else if (initialFocus instanceof HTMLElement) {
      initialFocus.focus();
    }
  }, [enabled, initialFocus, focusFirst]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !containerRef.current) return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        // Shift+Tab: If on first element, go to last
        if (activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: If on last element, go to first
        if (activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, getFocusableElements]);

  return {
    containerRef,
    focusFirst,
    focusLast,
  };
}

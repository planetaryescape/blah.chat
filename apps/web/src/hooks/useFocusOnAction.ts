"use client";

import { useCallback, useRef } from "react";

interface FocusTarget {
  element?: HTMLElement | null;
  selector?: string;
  fallback?: HTMLElement | null;
}

/**
 * Focus an element after an async action completes.
 * Uses requestAnimationFrame to ensure DOM has updated.
 *
 * Use case: After deleting a message, focus the next message or input.
 */
export function useFocusOnAction() {
  const pendingFocusRef = useRef<FocusTarget | null>(null);

  const focusAfterAction = useCallback((target: FocusTarget) => {
    pendingFocusRef.current = target;

    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      let elementToFocus: HTMLElement | null = null;

      if (target.element && document.body.contains(target.element)) {
        elementToFocus = target.element;
      } else if (target.selector) {
        elementToFocus = document.querySelector(target.selector);
      }

      if (
        !elementToFocus &&
        target.fallback &&
        document.body.contains(target.fallback)
      ) {
        elementToFocus = target.fallback;
      }

      if (elementToFocus) {
        elementToFocus.focus();

        // Ensure element is visible (check exists for JSDOM compatibility)
        if (typeof elementToFocus.scrollIntoView === "function") {
          elementToFocus.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }

      pendingFocusRef.current = null;
    });
  }, []);

  return { focusAfterAction };
}

"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Saves the currently focused element and returns focus to it
 * when the component unmounts or when returnFocus is called.
 *
 * Used for modals/dialogs to restore focus to trigger element on close.
 */
export function useFocusReturn() {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Capture focus on mount
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    return () => {
      // Return focus on unmount
      if (
        previouslyFocusedRef.current &&
        document.body.contains(previouslyFocusedRef.current)
      ) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, []);

  const returnFocus = useCallback(() => {
    if (
      previouslyFocusedRef.current &&
      document.body.contains(previouslyFocusedRef.current)
    ) {
      previouslyFocusedRef.current.focus();
    }
  }, []);

  const setReturnTarget = useCallback((element: HTMLElement | null) => {
    previouslyFocusedRef.current = element;
  }, []);

  return { returnFocus, setReturnTarget };
}

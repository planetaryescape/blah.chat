"use client";

import { useEffect, useRef } from "react";

/**
 * Declarative setTimeout hook with automatic cleanup on unmount.
 * Pass `null` as delay to disable the timeout.
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}

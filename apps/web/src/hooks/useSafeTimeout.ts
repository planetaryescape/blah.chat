"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Imperative setTimeout hook with automatic cleanup on unmount.
 * Returns setSafeTimeout/clearSafeTimeout for manual control.
 * All pending timeouts are cleared when component unmounts.
 */
export function useSafeTimeout() {
  const timeoutIds = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const setSafeTimeout = useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutIds.current.delete(id);
      callback();
    }, delay);
    timeoutIds.current.add(id);
    return id;
  }, []);

  const clearSafeTimeout = useCallback((id: ReturnType<typeof setTimeout>) => {
    clearTimeout(id);
    timeoutIds.current.delete(id);
  }, []);

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach(clearTimeout);
      timeoutIds.current.clear();
    };
  }, []);

  return { setSafeTimeout, clearSafeTimeout };
}

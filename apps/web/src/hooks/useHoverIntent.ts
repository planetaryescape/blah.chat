import { useCallback, useEffect, useRef, useState } from "react";

interface HoverIntentOptions {
  enterDelay?: number;
  leaveDelay?: number;
}

export function useHoverIntent({
  enterDelay = 350,
  leaveDelay = 150,
}: HoverIntentOptions = {}) {
  const [isHovered, setIsHovered] = useState(false);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    enterTimerRef.current = setTimeout(() => setIsHovered(true), enterDelay);
  }, [enterDelay]);

  const handleMouseLeave = useCallback(() => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    leaveTimerRef.current = setTimeout(() => setIsHovered(false), leaveDelay);
  }, [leaveDelay]);

  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  return {
    isHovered,
    handleMouseEnter,
    handleMouseLeave,
    handleFocus: useCallback(() => setIsHovered(true), []),
    handleBlur: useCallback(() => setIsHovered(false), []),
  };
}

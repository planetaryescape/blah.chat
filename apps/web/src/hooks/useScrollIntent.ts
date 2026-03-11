import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_SCROLL_THRESHOLD = 64;

export interface ScrollIntent {
  escapedFromBottom: boolean;
  autoScrollEnabled: boolean;
  enableAutoScroll: () => void;
}

interface UseScrollIntentOptions {
  scrollerRef: React.RefObject<HTMLElement | null>;
  threshold?: number;
}

export function useScrollIntent({
  scrollerRef,
  threshold = AUTO_SCROLL_THRESHOLD,
}: UseScrollIntentOptions): ScrollIntent {
  const [escapedFromBottom, setEscapedFromBottom] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const lastScrollTopRef = useRef(0);
  const pendingScrollUpIntentRef = useRef(false);
  const pointerActiveRef = useRef(false);
  const lastTouchYRef = useRef<number | null>(null);
  const rafId = useRef<number>(0);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const handleScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        const position = scroller.scrollTop;
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;
        const distanceFromBottom = maxScroll - position;
        const isNearBottom = distanceFromBottom <= threshold;
        const scrolledUp = position < lastScrollTopRef.current - 1;

        if (!autoScrollEnabled && isNearBottom) {
          setEscapedFromBottom(false);
          setAutoScrollEnabled(true);
        }

        if (
          autoScrollEnabled &&
          !isNearBottom &&
          scrolledUp &&
          (pendingScrollUpIntentRef.current || pointerActiveRef.current)
        ) {
          setEscapedFromBottom(true);
          setAutoScrollEnabled(false);
        }

        pendingScrollUpIntentRef.current = false;
        lastScrollTopRef.current = position;
      });
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        pendingScrollUpIntentRef.current = true;
      }
    };

    const handlePointerDown = () => {
      pointerActiveRef.current = true;
    };

    const handlePointerUp = () => {
      pointerActiveRef.current = false;
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      lastTouchYRef.current = touch.clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      const previous = lastTouchYRef.current;
      if (previous !== null && touch.clientY > previous + 1) {
        pendingScrollUpIntentRef.current = true;
      }
      lastTouchYRef.current = touch.clientY;
    };

    const handleTouchEnd = () => {
      lastTouchYRef.current = null;
    };

    scroller.addEventListener("scroll", handleScroll, { passive: true });
    scroller.addEventListener("wheel", handleWheel, { passive: true });
    scroller.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    scroller.addEventListener("pointerup", handlePointerUp, { passive: true });
    scroller.addEventListener("pointercancel", handlePointerUp, {
      passive: true,
    });
    scroller.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    scroller.addEventListener("touchmove", handleTouchMove, { passive: true });
    scroller.addEventListener("touchend", handleTouchEnd, { passive: true });
    scroller.addEventListener("touchcancel", handleTouchEnd, {
      passive: true,
    });
    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      scroller.removeEventListener("wheel", handleWheel);
      scroller.removeEventListener("pointerdown", handlePointerDown);
      scroller.removeEventListener("pointerup", handlePointerUp);
      scroller.removeEventListener("pointercancel", handlePointerUp);
      scroller.removeEventListener("touchstart", handleTouchStart);
      scroller.removeEventListener("touchmove", handleTouchMove);
      scroller.removeEventListener("touchend", handleTouchEnd);
      scroller.removeEventListener("touchcancel", handleTouchEnd);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [autoScrollEnabled, scrollerRef, threshold]);

  const enableAutoScroll = useCallback(() => {
    setEscapedFromBottom(false);
    setAutoScrollEnabled(true);
    pendingScrollUpIntentRef.current = false;
    pointerActiveRef.current = false;
    lastTouchYRef.current = null;
  }, []);

  return {
    escapedFromBottom,
    autoScrollEnabled,
    enableAutoScroll,
  };
}

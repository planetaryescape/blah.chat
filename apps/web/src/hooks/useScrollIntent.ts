import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_SCROLL_THRESHOLD = 100; // pixels from bottom
const ESCAPE_VELOCITY_THRESHOLD = 3; // px/ms - fast scroll = intentional escape
const RETURN_VELOCITY_THRESHOLD = 1; // px/ms - slow scroll = returning

interface ScrollHistory {
  position: number;
  time: number;
}

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

  const scrollHistory = useRef<ScrollHistory[]>([]);
  const rafId = useRef<number>(0);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const handleScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        const now = performance.now();
        const position = scroller.scrollTop;
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;
        const distanceFromBottom = maxScroll - position;

        scrollHistory.current.push({ position, time: now });
        if (scrollHistory.current.length > 3) {
          scrollHistory.current.shift();
        }

        if (scrollHistory.current.length < 2) return;

        const prev = scrollHistory.current[0];
        const curr = scrollHistory.current[scrollHistory.current.length - 1];
        const timeDiff = curr.time - prev.time;
        if (timeDiff === 0) return;

        const velocity = (curr.position - prev.position) / timeDiff;
        const isScrollingUp = velocity < 0;
        const isFastScroll = Math.abs(velocity) > ESCAPE_VELOCITY_THRESHOLD;
        const isSlowScroll = Math.abs(velocity) < RETURN_VELOCITY_THRESHOLD;
        const isNearBottom = distanceFromBottom < threshold;

        // User escaped: fast scroll up
        if (isScrollingUp && isFastScroll && !escapedFromBottom) {
          setEscapedFromBottom(true);
          setAutoScrollEnabled(false);
        }

        // User returned: slow scroll down AND near bottom
        if (
          !isScrollingUp &&
          isSlowScroll &&
          isNearBottom &&
          escapedFromBottom
        ) {
          setEscapedFromBottom(false);
          setAutoScrollEnabled(true);
        }
      });
    };

    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [scrollerRef, threshold, escapedFromBottom]);

  const enableAutoScroll = useCallback(() => {
    setEscapedFromBottom(false);
    setAutoScrollEnabled(true);
    scrollHistory.current = [];
  }, []);

  return {
    escapedFromBottom,
    autoScrollEnabled,
    enableAutoScroll,
  };
}

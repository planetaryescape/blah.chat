import { useCallback, useEffect, useRef, useState } from "react";

interface UseAutoScrollOptions {
  threshold?: number;
  animationDuration?: number;
}

interface UseAutoScrollReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: (behavior?: ScrollBehavior) => boolean;
  showScrollButton: boolean;
  isAtBottom: boolean;
}

export function useAutoScroll(
  options: UseAutoScrollOptions = {},
): UseAutoScrollReturn {
  const { threshold = 100, animationDuration = 400 } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(false);
  const resizeRAF = useRef<number | undefined>(undefined);

  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Refs to avoid stale closures in MutationObserver callback
  const userScrolledUpRef = useRef(userScrolledUp);
  const isAtBottomRef = useRef(isAtBottom);

  // Keep refs in sync with state
  useEffect(() => {
    userScrolledUpRef.current = userScrolledUp;
  }, [userScrolledUp]);

  useEffect(() => {
    isAtBottomRef.current = isAtBottom;
  }, [isAtBottom]);

  // Detect prefers-reduced-motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const checkIfAtBottom = useCallback(
    (container: HTMLElement): boolean => {
      return (
        container.scrollHeight - container.scrollTop - container.clientHeight <
        threshold
      );
    },
    [threshold],
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth"): boolean => {
      const container = containerRef.current;
      if (!container) return false;

      isAutoScrolling.current = true;
      // Respect prefers-reduced-motion
      const actualBehavior = prefersReducedMotion ? "auto" : behavior;
      const target = container.scrollHeight - container.clientHeight;
      container.scrollTo({ top: target, behavior: actualBehavior });

      // Verify after animation completes
      const verifyTimeout = actualBehavior === "smooth" ? animationDuration : 0;
      setTimeout(() => {
        isAutoScrolling.current = false;
        if (!container) return;

        const currentIsAtBottom = checkIfAtBottom(container);
        setIsAtBottom(currentIsAtBottom);

        // Retry if scroll failed and user didn't manually scroll
        if (!currentIsAtBottom && !userScrolledUp) {
          requestAnimationFrame(() => {
            if (container) {
              container.scrollTo({
                top: container.scrollHeight - container.clientHeight,
                behavior: "auto",
              });
            }
          });
        }
      }, verifyTimeout);

      return true;
    },
    [animationDuration, checkIfAtBottom, userScrolledUp, prefersReducedMotion],
  );

  // Handle user scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const currentIsAtBottom = checkIfAtBottom(container);
      setIsAtBottom(currentIsAtBottom);

      // User scrolled up if not at bottom AND scroll wasn't auto-triggered
      if (!currentIsAtBottom && !isAutoScrolling.current) {
        setUserScrolledUp(true);
        setShowScrollButton(true);
      } else if (currentIsAtBottom) {
        setUserScrolledUp(false);
        setShowScrollButton(false);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [checkIfAtBottom]);

  // Ref for scrollToBottom to avoid recreating MutationObserver
  const scrollToBottomRef = useRef(scrollToBottom);
  useEffect(() => {
    scrollToBottomRef.current = scrollToBottom;
  }, [scrollToBottom]);

  // MutationObserver for dynamic content changes during streaming
  // ResizeObserver on the container doesn't fire when scrollable content grows,
  // so we use MutationObserver to detect DOM changes (text updates, new nodes)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mutationObserver = new MutationObserver(() => {
      // Use refs for fresh values - avoids stale closure issue
      // Only auto-scroll if user is at bottom and hasn't scrolled up
      if (!userScrolledUpRef.current && isAtBottomRef.current) {
        // Debounce - cancel pending RAF before scheduling new
        if (resizeRAF.current) cancelAnimationFrame(resizeRAF.current);

        resizeRAF.current = requestAnimationFrame(() => {
          scrollToBottomRef.current("auto");
        });
      }
    });

    // Watch for text content changes and new nodes (covers streaming updates)
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      mutationObserver.disconnect();
      if (resizeRAF.current) {
        cancelAnimationFrame(resizeRAF.current);
      }
    };
  }, []); // Empty deps - observer setup only once, uses refs for fresh values

  return {
    containerRef,
    scrollToBottom,
    showScrollButton,
    isAtBottom,
  };
}

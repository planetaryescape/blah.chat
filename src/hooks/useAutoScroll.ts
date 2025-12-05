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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeRAF = useRef<number | undefined>(undefined);

  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

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
      const target = container.scrollHeight - container.clientHeight;
      container.scrollTo({ top: target, behavior });

      // Verify after animation completes
      const verifyTimeout = behavior === "smooth" ? animationDuration : 0;
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
    [animationDuration, checkIfAtBottom, userScrolledUp],
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

  // ResizeObserver for dynamic content changes (code blocks, images, etc)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      // Only auto-scroll if user is at bottom and hasn't scrolled up
      if (!userScrolledUp && isAtBottom) {
        // Debounce - cancel pending RAF before scheduling new
        if (resizeRAF.current) cancelAnimationFrame(resizeRAF.current);

        resizeRAF.current = requestAnimationFrame(() => {
          scrollToBottom("auto");
        });
      }
    });

    resizeObserverRef.current.observe(container);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [userScrolledUp, isAtBottom, scrollToBottom]);

  return {
    containerRef,
    scrollToBottom,
    showScrollButton,
    isAtBottom,
  };
}

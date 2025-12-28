import { useCallback, useEffect, useRef, useState } from "react";

interface UseAutoScrollOptions {
  threshold?: number;
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
  const { threshold = 100 } = options;

  const containerRef = useRef<HTMLDivElement>(null);
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

      container.scrollTo({
        top: container.scrollHeight - container.clientHeight,
        behavior,
      });

      return true;
    },
    [],
  );

  // Handle user scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const currentIsAtBottom = checkIfAtBottom(container);
      setIsAtBottom(currentIsAtBottom);
      setShowScrollButton(!currentIsAtBottom);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [checkIfAtBottom]);

  return {
    containerRef,
    scrollToBottom,
    showScrollButton,
    isAtBottom,
  };
}

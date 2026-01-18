import { useEffect, useRef } from "react";

interface AnchorState {
  element: HTMLElement | null;
  offsetTop: number;
}

/**
 * Scroll anchoring fallback for browsers without CSS overflow-anchor support (Safari).
 * When content above viewport changes (deletions, image loads, code expands),
 * maintains user's reading position by adjusting scroll.
 *
 * Only activates when CSS overflow-anchor is NOT supported.
 */
export function useScrollAnchor(
  containerRef: React.RefObject<HTMLElement | null>,
  enabled = true,
) {
  const anchorRef = useRef<AnchorState>({ element: null, offsetTop: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    // Check if CSS overflow-anchor is supported - skip JS fallback if native works
    if (CSS.supports("overflow-anchor", "auto")) return;

    const findAnchorElement = (): HTMLElement | null => {
      // Find first message visible in viewport (use data-message-id from ChatMessage)
      const messages = container.querySelectorAll("[data-message-id]");
      const containerRect = container.getBoundingClientRect();

      for (const message of messages) {
        const rect = message.getBoundingClientRect();
        // Element is at least partially visible
        if (
          rect.bottom > containerRect.top &&
          rect.top < containerRect.bottom
        ) {
          return message as HTMLElement;
        }
      }
      return null;
    };

    const saveAnchor = () => {
      const anchor = findAnchorElement();
      if (anchor) {
        anchorRef.current = {
          element: anchor,
          offsetTop:
            anchor.getBoundingClientRect().top -
            container.getBoundingClientRect().top,
        };
      }
    };

    const restoreAnchor = () => {
      const { element, offsetTop } = anchorRef.current;
      if (!element || !container.contains(element)) return;

      const newOffsetTop =
        element.getBoundingClientRect().top -
        container.getBoundingClientRect().top;
      const diff = newOffsetTop - offsetTop;

      // Only adjust if there's meaningful drift (>1px)
      if (Math.abs(diff) > 1) {
        container.scrollTop += diff;
      }
    };

    // ResizeObserver for element size changes (images loading, code expanding)
    const resizeObserver = new ResizeObserver(() => {
      restoreAnchor();
    });

    // MutationObserver for DOM changes (message deletions)
    const mutationObserver = new MutationObserver(() => {
      saveAnchor();
      requestAnimationFrame(restoreAnchor);
    });

    // Observe all message elements for size changes
    const messages = container.querySelectorAll("[data-message-id]");
    for (const msg of messages) {
      resizeObserver.observe(msg);
    }

    // Watch for DOM structure changes
    mutationObserver.observe(container, { childList: true, subtree: true });

    // Save anchor position on scroll
    container.addEventListener("scroll", saveAnchor, { passive: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      container.removeEventListener("scroll", saveAnchor);
    };
  }, [containerRef, enabled]);
}

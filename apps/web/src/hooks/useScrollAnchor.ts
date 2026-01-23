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
  const observedElementsRef = useRef<Set<Element>>(new Set());

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    // SSR safety + feature detection - skip JS fallback if native works
    try {
      if (typeof CSS !== "undefined" && CSS.supports("overflow-anchor", "auto"))
        return;
    } catch {
      // CSS.supports not available, continue with JS fallback
    }

    const findAnchorElement = (): HTMLElement | null => {
      const messages = container.querySelectorAll("[data-message-id]");
      const containerRect = container.getBoundingClientRect();

      for (const message of messages) {
        const rect = message.getBoundingClientRect();
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

      if (Math.abs(diff) > 5) {
        container.scrollTop += diff;
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      restoreAnchor();
    });

    // Track observed elements to avoid double-observation
    const observeMessage = (element: Element) => {
      if (!observedElementsRef.current.has(element)) {
        observedElementsRef.current.add(element);
        resizeObserver.observe(element);
      }
    };

    // Observe existing messages
    const messages = container.querySelectorAll("[data-message-id]");
    for (const msg of messages) {
      observeMessage(msg);
    }

    // MutationObserver for DOM changes - also observes new messages for resize
    const mutationObserver = new MutationObserver((mutations) => {
      // Observe any new message elements
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.hasAttribute("data-message-id")) {
              observeMessage(node);
            }
            // Check descendants too
            const newMessages = node.querySelectorAll("[data-message-id]");
            newMessages.forEach(observeMessage);
          }
        }
      }

      saveAnchor();
      requestAnimationFrame(restoreAnchor);
    });

    mutationObserver.observe(container, { childList: true, subtree: true });
    container.addEventListener("scroll", saveAnchor, { passive: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      container.removeEventListener("scroll", saveAnchor);
      observedElementsRef.current.clear();
    };
  }, [containerRef, enabled]);
}

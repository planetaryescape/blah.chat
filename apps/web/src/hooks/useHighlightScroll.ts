"use client";

import type { Virtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import type { GroupedItem } from "@/hooks/useMessageGrouping";

interface UseHighlightScrollOptions {
  highlightMessageId?: string;
  grouped: GroupedItem[];
  virtualizer: Virtualizer<any, any>;
}

const SCROLL_DELAY = 300;
const HIGHLIGHT_DURATION = 1200;

/** Scrolls to and highlights a message when URL contains ?messageId=X */
export function useHighlightScroll({
  highlightMessageId,
  grouped,
  virtualizer,
}: UseHighlightScrollOptions): void {
  const scrolledToHighlight = useRef(false);

  useEffect(() => {
    if (!highlightMessageId || scrolledToHighlight.current) return;

    const targetIndex = grouped.findIndex((item) => {
      if (item.type === "message") return item.data._id === highlightMessageId;
      if (item.type === "comparison") {
        return (
          item.userMessage._id === highlightMessageId ||
          item.assistantMessages.some((m) => m._id === highlightMessageId)
        );
      }
      return false;
    });

    if (targetIndex === -1) return;

    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(targetIndex, {
        align: "start",
        behavior: "smooth",
      });
    });

    setTimeout(() => {
      const element = document.getElementById(`message-${highlightMessageId}`);
      if (element) {
        // Only add highlight, don't scroll again (virtualizer already scrolled)
        element.classList.add("message-highlight");
        setTimeout(
          () => element.classList.remove("message-highlight"),
          HIGHLIGHT_DURATION,
        );
      }
    }, SCROLL_DELAY);

    scrolledToHighlight.current = true;
  }, [highlightMessageId, grouped, virtualizer]);

  useEffect(() => {
    scrolledToHighlight.current = false;
  }, [highlightMessageId]);
}

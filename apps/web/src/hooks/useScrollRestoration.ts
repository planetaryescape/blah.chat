"use client";

import { useEffect, useRef } from "react";
import type { VirtuosoHandle } from "react-virtuoso";

const STORAGE_KEY = "blah-scroll-positions";
const STORAGE_TTL = 24 * 60 * 60 * 1000; // 24h

interface ScrollData {
  position: number;
  timestamp: number;
}

export function useScrollRestoration(
  conversationId: string,
  scrollerRef: React.RefObject<HTMLElement | null>,
  virtuosoRef?: React.RefObject<VirtuosoHandle | null>,
) {
  const isRestoringRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const pendingPositionRef = useRef<{ id: string; pos: number } | null>(null);

  const getPositions = (): Record<string, ScrollData> => {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  };

  const savePositionImmediate = (id: string, pos: number) => {
    try {
      const positions = getPositions();
      positions[id] = { position: pos, timestamp: Date.now() };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
      pendingPositionRef.current = null;
    } catch {}
  };

  const loadPosition = (): number | null => {
    try {
      const data = getPositions()[conversationId];
      if (!data) return null;
      if (Date.now() - data.timestamp > STORAGE_TTL) {
        const positions = getPositions();
        delete positions[conversationId];
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
        return null;
      }
      return data.position;
    } catch {
      return null;
    }
  };

  const restore = (): boolean => {
    const savedPosition = loadPosition();
    if (savedPosition === null) return false;

    isRestoringRef.current = true;

    if (virtuosoRef?.current) {
      virtuosoRef.current.scrollTo({ top: savedPosition });
    } else if (scrollerRef.current) {
      scrollerRef.current.scrollTop = savedPosition;
    }

    setTimeout(() => {
      isRestoringRef.current = false;
    }, 300);

    return true;
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const currentConversationId = conversationId;

    const handleScroll = () => {
      if (isRestoringRef.current) return;

      const pos = Math.floor(scroller.scrollTop);
      pendingPositionRef.current = { id: currentConversationId, pos };

      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        if (pendingPositionRef.current?.id === currentConversationId) {
          savePositionImmediate(currentConversationId, pos);
        }
      }, 300);
    };

    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      clearTimeout(saveTimeoutRef.current);
      // Flush pending save on cleanup to prevent losing position on quick switch
      if (pendingPositionRef.current?.id === currentConversationId) {
        savePositionImmediate(
          pendingPositionRef.current.id,
          pendingPositionRef.current.pos,
        );
      }
    };
  }, [conversationId, scrollerRef]);

  return { restore, isRestoring: () => isRestoringRef.current };
}

export function clearScrollPosition(conversationId: string): void {
  try {
    const positions = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    delete positions[conversationId];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {}
}

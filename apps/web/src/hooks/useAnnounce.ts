import { useCallback, useRef } from "react";

/**
 * Screen reader announcement hook for accessibility.
 * Uses a live region to announce messages to assistive technology
 * without disrupting focus or visual flow.
 */
export function useAnnounce() {
  const announcerRef = useRef<HTMLDivElement | null>(null);

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      const announcer = announcerRef.current;
      if (!announcer) return;

      // Update aria-live priority
      announcer.setAttribute("aria-live", priority);

      // Clear then set after brief delay for reliable announcement
      announcer.textContent = "";
      setTimeout(() => {
        announcer.textContent = message;
      }, 100);
    },
    [],
  );

  const clearAnnouncement = useCallback(() => {
    if (announcerRef.current) {
      announcerRef.current.textContent = "";
    }
  }, []);

  return { announcerRef, announce, clearAnnouncement };
}

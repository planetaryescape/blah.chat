import { type RefCallback, useCallback, useRef } from "react";

export function useSyncedScroll(enabled = true) {
  const refs = useRef<Set<HTMLElement>>(new Set());
  const syncing = useRef(false);

  const register: RefCallback<HTMLElement> = useCallback(
    (el) => {
      if (!el) return;

      refs.current.add(el);

      const handleScroll = () => {
        if (!enabled || syncing.current) return;

        syncing.current = true;

        // Calculate scroll percentage
        const scrollPercent =
          el.scrollTop / (el.scrollHeight - el.clientHeight);

        // Sync to other panels via RAF (60fps throttle)
        requestAnimationFrame(() => {
          for (const other of refs.current) {
            if (other !== el) {
              other.scrollTop =
                scrollPercent * (other.scrollHeight - other.clientHeight);
            }
          }
          syncing.current = false;
        });
      };

      // Passive listener for mobile performance
      el.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        el.removeEventListener("scroll", handleScroll);
        refs.current.delete(el);
      };
    },
    [enabled],
  );

  return { register };
}

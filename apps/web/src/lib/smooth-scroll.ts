/**
 * Smooth scroll utilities for chat message containers
 * Uses easeOutQuart easing for professional, ChatGPT-like feel
 */

/** easeOutQuart: smooth deceleration curve */
function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4;
}

/**
 * Smooth scroll to bottom with 60fps RAF animation
 * @param container - scrollable element
 * @param duration - animation duration in ms (default 300)
 * @returns Promise that resolves when animation completes
 */
export function smoothScrollToBottom(
  container: HTMLElement,
  duration = 300,
): Promise<void> {
  return new Promise((resolve) => {
    const start = container.scrollTop;
    const end = container.scrollHeight - container.clientHeight;
    const distance = end - start;

    // Already at bottom (within 10px threshold)
    if (Math.abs(distance) < 10) {
      resolve();
      return;
    }

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);

      container.scrollTop = start + distance * eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
}

/**
 * Scroll to bottom with smooth animation or instant fallback
 * Respects reduced motion preference when passed
 */
export function scrollToBottom(
  container: HTMLElement,
  options: { smooth?: boolean; duration?: number } = {},
): Promise<void> {
  const { smooth = true, duration = 300 } = options;

  if (smooth) {
    return smoothScrollToBottom(container, duration);
  }

  // Instant scroll
  container.scrollTop = container.scrollHeight;
  return Promise.resolve();
}

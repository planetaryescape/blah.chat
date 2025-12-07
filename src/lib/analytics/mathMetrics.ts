import { analytics } from "@/lib/analytics";

/**
 * Performance tracking wrapper for math rendering
 * Returns cleanup function to call when rendering completes
 *
 * Tracks:
 * - Render duration (time to paint)
 * - Equation complexity (length)
 * - Display mode (inline vs block)
 * - Streaming state
 *
 * Warns if rendering exceeds 50ms threshold
 */
export function trackMathRendering(
  latex: string,
  displayMode: boolean,
  isStreaming: boolean,
) {
  const start = performance.now();

  return () => {
    const duration = performance.now() - start;

    analytics.track("math_rendered", {
      displayMode,
      equationLength: latex.length,
      renderTimeMs: Math.round(duration),
      isStreaming,
    });

    // Performance warning for slow renders
    if (duration > 50) {
      console.warn(
        `[Math] Slow render: ${Math.round(duration)}ms for ${latex.length} chars`,
        { latex: latex.slice(0, 50) },
      );
    }
  };
}

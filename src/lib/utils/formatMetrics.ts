/**
 * Format Time To First Token for display
 * <100ms: "45ms"
 * <1s: "0.45s"
 * <10s: "2.3s"
 * >10s: "15s"
 */
export function formatTTFT(milliseconds: number): string {
  if (milliseconds < 100) {
    return `${Math.round(milliseconds)}ms`;
  }
  if (milliseconds < 1000) {
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }
  if (milliseconds < 10000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }
  return `${Math.round(milliseconds / 1000)}s`;
}

/**
 * Detect if response was cached (very fast TTFT)
 */
export function isCachedResponse(ttft: number): boolean {
  return ttft < 50; // <50ms indicates cached
}

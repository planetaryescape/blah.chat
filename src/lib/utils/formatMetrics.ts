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
 * Format duration in milliseconds for display
 * <1ms: "<1ms"
 * <1000ms: "234ms"
 * <10s: "1.2s", "5.3s"
 * <60s: "15s", "45s"
 * >=60s: "1m 23s", "5m 12s"
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1) {
    return "<1ms";
  }
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }

  const seconds = milliseconds / 1000;

  if (seconds < 10) {
    return `${seconds.toFixed(1)}s`;
  }
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  // Minutes + seconds
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Detect if response was cached (very fast TTFT)
 */
export function isCachedResponse(ttft: number): boolean {
  return ttft < 50; // <50ms indicates cached
}

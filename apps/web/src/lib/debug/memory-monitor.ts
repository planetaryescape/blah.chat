/**
 * Development-only memory monitor for detecting memory leaks
 * Only runs in development mode and when performance.memory is available (Chrome)
 */

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: MemoryInfo;
}

/**
 * Start monitoring memory usage at regular intervals
 * Logs warnings when heap usage grows significantly
 *
 * @param intervalMs - How often to check memory (default: 10000ms)
 * @returns Cleanup function to stop monitoring
 */
export function startMemoryMonitor(intervalMs = 10000): () => void {
  if (process.env.NODE_ENV !== "development") {
    return () => {};
  }

  const perf = performance as PerformanceWithMemory;
  if (!perf.memory) {
    console.log("[MemoryMonitor] Not available (Chrome only)");
    return () => {};
  }

  const baselineHeap = perf.memory.usedJSHeapSize;
  let lastHeap = baselineHeap;
  const samples: number[] = [];

  console.log(
    `[MemoryMonitor] Started - baseline: ${(baselineHeap / 1024 / 1024).toFixed(1)}MB`,
  );

  const intervalId = setInterval(() => {
    if (!perf.memory) return;

    const currentHeap = perf.memory.usedJSHeapSize;
    const delta = currentHeap - lastHeap;
    const totalGrowth = currentHeap - baselineHeap;

    samples.push(currentHeap);
    if (samples.length > 30) samples.shift(); // Keep last 30 samples

    // Calculate trend
    const recentAvg =
      samples.slice(-5).reduce((a, b) => a + b, 0) /
      Math.min(5, samples.length);
    const olderAvg =
      samples.slice(0, 5).reduce((a, b) => a + b, 0) /
      Math.min(5, samples.length);
    const trend = recentAvg - olderAvg;

    // Warn if heap grew >50MB since start or >10MB in last interval
    if (totalGrowth > 50 * 1024 * 1024 || delta > 10 * 1024 * 1024) {
      console.warn(
        `[MemoryMonitor] ⚠️ High memory growth detected:`,
        `\n  Current: ${(currentHeap / 1024 / 1024).toFixed(1)}MB`,
        `\n  Delta: +${(delta / 1024 / 1024).toFixed(1)}MB`,
        `\n  Total growth: +${(totalGrowth / 1024 / 1024).toFixed(1)}MB`,
        `\n  Trend: ${trend > 0 ? "+" : ""}${(trend / 1024 / 1024).toFixed(1)}MB`,
      );
    }

    lastHeap = currentHeap;
  }, intervalMs);

  return () => {
    clearInterval(intervalId);
    console.log("[MemoryMonitor] Stopped");
  };
}

/**
 * Take a memory snapshot and log current heap usage
 * Useful for manual debugging
 */
export function logMemorySnapshot(label = "Snapshot"): void {
  if (process.env.NODE_ENV !== "development") return;

  const perf = performance as PerformanceWithMemory;
  if (!perf.memory) return;

  console.log(
    `[Memory ${label}] Used: ${(perf.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB / ${(perf.memory.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
  );
}

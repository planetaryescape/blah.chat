// OS Platform (existing)
export type Platform = "mac" | "windows" | "other";

export function getPlatform(): Platform {
  if (typeof window === "undefined") return "other";

  const ua = window.navigator.userAgent;
  if (ua.includes("Mac")) return "mac";
  if (ua.includes("Win")) return "windows";
  return "other";
}

export function getModifierKey(): string {
  return getPlatform() === "mac" ? "⌘" : "Ctrl";
}

// Device Platform (mobile vs web)
export type DevicePlatform = "web" | "mobile";
export type DataFetchingStrategy = "convex" | "sse" | "polling";

let cachedDevicePlatform: DevicePlatform | null = null;

/**
 * Detect if running on mobile device
 *
 * Detection hierarchy:
 * 1. User-agent (iPhone, Android, mobile browsers)
 * 2. Viewport width (< 768px)
 * 3. Touch capability
 */
export function detectDevicePlatform(): DevicePlatform {
  if (cachedDevicePlatform) return cachedDevicePlatform;

  if (typeof window === "undefined") {
    return "web"; // SSR fallback
  }

  // 1. User-agent detection
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ["android", "iphone", "ipad", "ipod", "mobile"];
  const isMobileUA = mobileKeywords.some((keyword) =>
    userAgent.includes(keyword),
  );

  if (isMobileUA) {
    cachedDevicePlatform = "mobile";
    return cachedDevicePlatform;
  }

  // 2. Viewport detection (< 768px = mobile)
  const isMobileViewport = window.innerWidth < 768;

  // 3. Touch capability
  const hasTouchScreen =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (isMobileViewport && hasTouchScreen) {
    cachedDevicePlatform = "mobile";
    return cachedDevicePlatform;
  }

  cachedDevicePlatform = "web";
  return cachedDevicePlatform;
}

/**
 * Determine data fetching strategy
 *
 * Strategy:
 * - Web desktop: Convex WebSocket (real-time, bidirectional)
 * - Mobile: SSE (battery-optimized) with polling fallback
 *
 * Returns:
 * - "convex": Use Convex WebSocket (web desktop)
 * - "sse": Use Server-Sent Events (mobile, battery-optimized)
 * - "polling": Use HTTP polling (fallback if SSE fails - handled in hooks)
 */
export function getDataFetchingStrategy(): DataFetchingStrategy {
  const platform = detectDevicePlatform();

  if (platform === "web") {
    return "convex";
  }

  // Mobile: prefer SSE, polling fallback handled in hooks
  return "sse";
}

/**
 * Check if should use SSE (mobile)
 */
export function shouldUseSSE(): boolean {
  return getDataFetchingStrategy() === "sse";
}

/**
 * Check if should use Convex WebSocket (web desktop)
 */
export function shouldUseConvex(): boolean {
  return getDataFetchingStrategy() === "convex";
}

/**
 * Manual override for testing
 * localStorage: "blah_data_strategy" = "convex" | "sse" | "polling"
 */
export function getManualOverride(): DataFetchingStrategy | null {
  if (typeof window === "undefined") return null;

  const override = localStorage.getItem("blah_data_strategy");
  if (override === "convex" || override === "sse" || override === "polling") {
    return override;
  }

  return null;
}

/**
 * Get effective strategy with manual override support
 */
export function getEffectiveStrategy(): DataFetchingStrategy {
  const manualOverride = getManualOverride();
  if (manualOverride) return manualOverride;

  return getDataFetchingStrategy();
}

/**
 * Reset cached platform (useful for testing)
 */
export function resetDevicePlatformCache(): void {
  cachedDevicePlatform = null;
}

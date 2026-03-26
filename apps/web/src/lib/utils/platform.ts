// OS Platform
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

/**
 * Server-safe modifier key that returns "Ctrl" during SSR
 * and the correct platform-specific key on the client.
 */
export function getServerSafeModifierKey(): string {
  if (typeof window === "undefined") return "Ctrl";
  return getPlatform() === "mac" ? "⌘" : "Ctrl";
}

// Device Platform (mobile vs web)
export type DevicePlatform = "web" | "mobile";

let cachedDevicePlatform: DevicePlatform | null = null;

export function detectDevicePlatform(): DevicePlatform {
  if (cachedDevicePlatform) return cachedDevicePlatform;

  if (typeof window === "undefined") {
    return "web";
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ["android", "iphone", "ipad", "ipod", "mobile"];
  const isMobileUA = mobileKeywords.some((keyword) =>
    userAgent.includes(keyword),
  );

  if (isMobileUA) {
    cachedDevicePlatform = "mobile";
    return cachedDevicePlatform;
  }

  const isMobileViewport = window.innerWidth < 768;
  const hasTouchScreen =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (isMobileViewport && hasTouchScreen) {
    cachedDevicePlatform = "mobile";
    return cachedDevicePlatform;
  }

  cachedDevicePlatform = "web";
  return cachedDevicePlatform;
}

export function resetDevicePlatformCache(): void {
  cachedDevicePlatform = null;
}

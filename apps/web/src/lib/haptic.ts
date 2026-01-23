/**
 * Haptic feedback utility using Web Vibration API.
 *
 * Provides tactile confirmation for mobile users on supported devices.
 * iOS does not support Vibration API - graceful no-op on unsupported platforms.
 */

export const HAPTIC_PATTERNS = {
  LIGHT: [10], // Selection, tap
  MEDIUM: [20, 30, 20], // Action, submit
  HEAVY: [30, 50, 30], // Destructive action
  SUCCESS: [50, 30, 50], // Copy complete
  ERROR: [10, 50, 10, 50, 100],
} as const;

export type HapticPattern = keyof typeof HAPTIC_PATTERNS;

/**
 * Check if haptic feedback is supported on this device.
 * Returns false on iOS (no Vibration API support) and desktop browsers.
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

/**
 * Trigger haptic feedback with specified pattern.
 * Silently fails on unsupported devices.
 */
export function triggerHaptic(pattern: HapticPattern): void {
  if (!isHapticSupported()) return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[pattern]);
  } catch {
    /* silent fail */
  }
}

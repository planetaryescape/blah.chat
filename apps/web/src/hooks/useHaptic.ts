import { useCallback } from "react";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { useUserPreference } from "@/hooks/useUserPreference";
import {
  type HapticPattern,
  isHapticSupported,
  triggerHaptic,
} from "@/lib/haptic";

/**
 * Hook for haptic feedback that respects user preferences and device capabilities.
 *
 * Only triggers on touch devices when user has haptic enabled.
 * Silent no-op on desktop or when disabled.
 */
export function useHaptic() {
  const { isTouchDevice } = useMobileDetect();
  const hapticEnabled = useUserPreference("hapticFeedbackEnabled");

  const haptic = useCallback(
    (pattern: HapticPattern = "LIGHT") => {
      if (!hapticEnabled || !isTouchDevice) return;
      triggerHaptic(pattern);
    },
    [hapticEnabled, isTouchDevice],
  );

  return {
    haptic,
    isSupported: isHapticSupported(),
    isEnabled: hapticEnabled && isTouchDevice,
  };
}

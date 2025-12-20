"use client";

import posthog from "posthog-js";
import { useEffect, useState } from "react";

/**
 * Hook for checking PostHog feature flags.
 * Returns undefined while loading, then boolean once flags are loaded.
 *
 * @param flagKey - The feature flag key to check
 * @returns undefined (loading), true (enabled), or false (disabled)
 */
export function useFeatureFlag(flagKey: string): boolean | undefined {
  const [enabled, setEnabled] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if flags already loaded
    const checkFlag = () => {
      const value = posthog.isFeatureEnabled(flagKey);
      if (value !== undefined) {
        setEnabled(value ?? false);
        return true;
      }
      return false;
    };

    // Try immediately
    if (checkFlag()) return;

    // Wait for flags to load
    posthog.onFeatureFlags(() => {
      checkFlag();
    });
  }, [flagKey]);

  return enabled;
}

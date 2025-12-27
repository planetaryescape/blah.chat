"use client";

import { useEffect, useState } from "react";
import { getServerSafeModifierKey } from "@/lib/utils/platform";

/**
 * Hook that provides the platform-specific modifier key in a hydration-safe way.
 *
 * During SSR and initial hydration, returns "Ctrl" to prevent hydration mismatches.
 * After hydration, updates to the correct platform-specific key (⌘ on Mac, Ctrl elsewhere).
 */
export function useModifierKey(): string {
  const [modifierKey, setModifierKey] = useState("Ctrl");

  useEffect(() => {
    // After hydration, update to the actual platform-specific key
    setModifierKey(getServerSafeModifierKey());
  }, []);

  return modifierKey;
}

"use client";

import { useEffect } from "react";
import { useAccessibilitySettings } from "@/hooks/useAccessibilitySettings";
import { cleanupOldData } from "@/lib/cache";

/**
 * Cache provider that initializes and manages the local IndexedDB cache.
 * Runs cleanup on app start (non-blocking).
 * Also initializes accessibility settings (high contrast, text scale).
 */
export function CacheProvider({ children }: { children: React.ReactNode }) {
  // Initialize accessibility settings (applies classes to document)
  useAccessibilitySettings();

  useEffect(() => {
    // Run cleanup on app start (non-blocking)
    cleanupOldData().catch((error) => {
      console.error("[CacheProvider] Cleanup failed:", error);
    });
  }, []);

  return <>{children}</>;
}

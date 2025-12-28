"use client";

import { useEffect } from "react";
import { cleanupOldData } from "@/lib/cache";

/**
 * Cache provider that initializes and manages the local IndexedDB cache.
 * Runs cleanup on app start (non-blocking).
 */
export function CacheProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Run cleanup on app start (non-blocking)
    cleanupOldData().catch((error) => {
      console.error("[CacheProvider] Cleanup failed:", error);
    });
  }, []);

  return <>{children}</>;
}

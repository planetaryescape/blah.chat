"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";
import { clearUserDataOnLogout } from "@/lib/logout";

/**
 * AuthStateListener Component
 *
 * Listens for authentication state changes and clears user data
 * from client storage when the user signs out.
 *
 * This prevents data leakage between user sessions on the same device.
 */
export function AuthStateListener({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId } = useAuth();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Skip on first render (when prevUserIdRef is undefined)
    if (prevUserIdRef.current === undefined) {
      prevUserIdRef.current = userId;
      return;
    }

    // User signed out (had a userId, now doesn't)
    if (prevUserIdRef.current && !userId) {
      console.log("[AuthStateListener] User signed out, clearing data");
      clearUserDataOnLogout();
      analytics.reset();
    }

    // User switched (different userId than before)
    if (prevUserIdRef.current && userId && prevUserIdRef.current !== userId) {
      console.log("[AuthStateListener] User switched, clearing previous data");
      clearUserDataOnLogout();
      analytics.reset();
      // Re-identify new user
      analytics.identify(userId);
    }

    // Update ref for next comparison
    prevUserIdRef.current = userId;
  }, [userId, isSignedIn]);

  return <>{children}</>;
}

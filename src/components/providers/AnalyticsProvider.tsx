"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { analytics, initAnalytics } from "@/lib/analytics";

/**
 * Analytics provider that initializes PostHog on mount
 * Wrap app content with this to enable analytics tracking
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    initAnalytics();
  }, []);

  // Identify user when authenticated
  useEffect(() => {
    if (isLoaded && user?.id) {
      analytics.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        createdAt: user.createdAt,
      });
    }
  }, [
    isLoaded,
    user?.id,
    user?.primaryEmailAddress?.emailAddress,
    user?.fullName,
    user?.createdAt,
  ]);

  return <>{children}</>;
}

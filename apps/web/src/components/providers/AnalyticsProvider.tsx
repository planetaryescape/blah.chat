"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { analytics, initAnalytics } from "@/lib/analytics";

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      const url = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      analytics.pageview(url);
    }
  }, [pathname, searchParams]);

  return null;
}

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

  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </>
  );
}

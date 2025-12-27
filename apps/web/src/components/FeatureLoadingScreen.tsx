"use client";

import { Loader2 } from "lucide-react";

/**
 * Full-page loading screen shown while user preferences are being fetched.
 * Used by feature-gated pages to prevent flash of "Feature Disabled" message.
 */
export function FeatureLoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

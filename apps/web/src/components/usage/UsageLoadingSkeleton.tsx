"use client";

import { Loader2 } from "lucide-react";

export function UsageLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground animate-pulse">
          Loading usage stats...
        </p>
      </div>
    </div>
  );
}

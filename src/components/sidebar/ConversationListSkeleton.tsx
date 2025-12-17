"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ConversationListSkeleton() {
  return (
    <div className="space-y-2 px-2 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-1 rounded-md px-0 py-0",
            "hover:bg-accent/10 transition-colors",
          )}
        >
          {/* Text content */}
          <div className="flex-1 space-y-2 min-w-0">
            {/* Title */}
            <Skeleton className="h-4 w-full" />
          </div>

          {/* More menu skeleton */}
          <Skeleton className="h-4 w-4 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

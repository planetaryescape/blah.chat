"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ConversationListSkeleton() {
  return (
    <div className="space-y-2 px-2 py-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-3 rounded-md p-3",
            "hover:bg-accent/50 transition-colors",
          )}
        >
          {/* Icon skeleton */}
          <Skeleton className="h-5 w-5 rounded shrink-0" />

          {/* Text content */}
          <div className="flex-1 space-y-2 min-w-0">
            {/* Title */}
            <Skeleton className="h-4 w-full" />
            {/* Preview text */}
            <Skeleton className="h-3 w-2/3" />
          </div>

          {/* More menu skeleton */}
          <Skeleton className="h-4 w-4 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

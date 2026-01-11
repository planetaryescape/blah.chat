"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ConversationListSkeleton() {
  return (
    <div className="space-y-0.5 px-0 pb-1 py-2">
      {/* Project filter skeleton */}
      <Skeleton className="h-10 w-full mb-2" />

      {/* Conversation item skeletons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-1 rounded-md px-0 py-1.5">
          {/* Title skeleton */}
          <Skeleton className="h-5 flex-1 min-w-0" />

          {/* More menu skeleton */}
          <Skeleton className="h-5 w-4 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

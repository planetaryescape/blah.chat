"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function NoteListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg border bg-card">
          {/* Title */}
          <Skeleton className="h-4 w-3/4 mb-2" />

          {/* Excerpt (2 lines) */}
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-2/3 mb-2" />

          {/* Tags and timestamp */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
            <div className="flex-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

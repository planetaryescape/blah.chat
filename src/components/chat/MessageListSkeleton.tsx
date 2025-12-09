"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function MessageListSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Simulate a few message skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "justify-end" : ""}`}>
          {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
          <div className={`space-y-2 ${i % 2 === 0 ? "items-end" : ""}`}>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
            {i === 1 && <Skeleton className="h-4 w-32" />}
          </div>
          {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
        </div>
      ))}
    </div>
  );
}

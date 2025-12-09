"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function MessageListSkeleton() {
  const userMessageClass = cn(
    "relative ml-auto max-w-[90%] sm:max-w-[75%] rounded-[2rem] rounded-tr-sm",
    "px-5 py-3 sm:px-6 sm:py-4",
    "bg-primary/5", // Lighter variant for skeleton
    "border border-primary/10"
  );

  const assistantMessageClass = cn(
    "relative mr-auto max-w-[95%] sm:max-w-[85%] rounded-[2rem] rounded-tl-sm",
    "px-5 py-3 sm:px-6 sm:py-4",
    "bg-muted/50 border border-border/50" // Lighter variant for skeleton
  );

  return (
    <div className="flex-1 w-full min-w-0 overflow-y-auto relative">
      <div className="w-full max-w-4xl mx-auto p-4 space-y-10">
        {/* Simulate a conversation history */}
        {[1, 2, 3].map((i) => {
          const isUser = i % 2 !== 0; // Alternating
          return (
            <div
              key={i}
              className={cn(
                "flex w-full mb-10",
                isUser ? "justify-end" : "justify-start"
              )}
            >
              <div className={isUser ? userMessageClass : assistantMessageClass}>
                 <div className="space-y-2">
                    <Skeleton className={cn("h-4", isUser ? "w-32 ml-auto" : "w-48")} />
                    <Skeleton className={cn("h-4", isUser ? "w-48 ml-auto" : "w-[300px] sm:w-[400px]")} />
                    {!isUser && i === 2 && (
                         <Skeleton className="h-4 w-64" />
                    )}
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

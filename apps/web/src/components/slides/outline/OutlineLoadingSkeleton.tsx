"use client";

import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface OutlineLoadingSkeletonProps {
  aspectRatio?: "16:9" | "1:1" | "9:16";
}

export function OutlineLoadingSkeleton({
  aspectRatio = "16:9",
}: OutlineLoadingSkeletonProps) {
  // Presentations (16:9) typically have more slides
  const slideCount = aspectRatio === "16:9" ? 8 : 6;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Left Sidebar - Slide List Skeleton */}
      <div className="w-80 border-r border-border/50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <Skeleton className="h-6 w-32" />
        </div>

        {/* Slide Cards */}
        <div className="flex-1 overflow-hidden p-3 space-y-3">
          {Array.from({ length: slideCount }).map((_, i) => (
            <div
              key={i}
              className="p-3 border border-border/50 rounded-lg space-y-2 bg-card/50"
              style={{
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor Area - Skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        <div className="p-6 border-b border-border/50">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Editor Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Title Field Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Content Field Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-32 w-full" />
          </div>

          {/* Centered Loading Indicator */}
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary animate-pulse" />
              <p className="text-muted-foreground font-medium">
                Generating your outline...
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                This usually takes 10-20 seconds
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

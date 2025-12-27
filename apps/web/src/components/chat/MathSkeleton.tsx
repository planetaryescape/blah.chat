import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface MathSkeletonProps {
  /**
   * Whether this is display math or inline math
   * @default false (inline)
   */
  isDisplay?: boolean;
  className?: string;
}

/**
 * Animated skeleton placeholder for lazy-rendered math equations
 * Shows while IntersectionObserver waits for equation to enter viewport
 *
 * Phase 4A: Mobile performance optimization
 */
export const MathSkeleton = forwardRef<HTMLDivElement, MathSkeletonProps>(
  ({ isDisplay = false, className }, ref) => {
    if (isDisplay) {
      return (
        <div
          ref={ref}
          className={cn(
            "animate-pulse rounded-lg bg-gradient-to-r from-muted/50 to-muted/30",
            "h-20 w-full", // Estimated display math height
            className,
          )}
          role="status"
          aria-label="Loading mathematical equation"
        >
          <span className="sr-only">Loading equation...</span>
        </div>
      );
    }

    return (
      <span
        ref={ref}
        className={cn(
          "inline-block animate-pulse rounded bg-gradient-to-r from-muted/50 to-muted/30",
          "h-[1.5em] w-16", // Estimated inline math dimensions
          className,
        )}
        role="status"
        aria-label="Loading mathematical expression"
      >
        <span className="sr-only">Loading expression...</span>
      </span>
    );
  },
);

MathSkeleton.displayName = "MathSkeleton";

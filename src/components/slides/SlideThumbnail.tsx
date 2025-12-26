"use client";

import { useQuery } from "convex/react";
import { AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface Props {
  slide: Doc<"slides">;
  index: number;
  isActive: boolean;
  onClick: () => void;
  aspectRatio?: "16:9" | "1:1" | "9:16";
}

const ASPECT_CLASSES = {
  "16:9": "aspect-video",
  "1:1": "aspect-square",
  "9:16": "aspect-[9/16]",
} as const;

export function SlideThumbnail({
  slide,
  index,
  isActive,
  onClick,
  aspectRatio = "16:9",
}: Props) {
  const aspectClass = ASPECT_CLASSES[aspectRatio];
  const imageUrl = useQuery(
    // @ts-ignore - Type depth exceeded with 94+ Convex modules
    api.storage.getUrl,
    slide.imageStorageId
      ? { storageId: slide.imageStorageId as Id<"_storage"> }
      : "skip",
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full max-w-[200px] mx-auto rounded-lg border-2 transition-all overflow-hidden text-left block",
        isActive
          ? "border-primary ring-2 ring-primary/20"
          : "border-transparent hover:border-muted-foreground/30",
      )}
    >
      <div className={cn(aspectClass, "bg-muted relative")}>
        {/* Pending State */}
        {slide.imageStatus === "pending" && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <span className="text-xs">Waiting...</span>
          </div>
        )}

        {/* Generating State */}
        {slide.imageStatus === "generating" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
          </div>
        )}

        {/* Error State */}
        {slide.imageStatus === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive">
            <AlertCircle className="h-5 w-5 mb-1" />
            <span className="text-xs">Failed</span>
          </div>
        )}

        {/* Complete State */}
        {slide.imageStatus === "complete" && imageUrl && (
          <Image
            src={imageUrl}
            alt={slide.title}
            fill
            className="object-cover"
            sizes="256px"
          />
        )}

        {/* Complete but loading URL */}
        {slide.imageStatus === "complete" && !imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Slide number badge */}
        <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
          {index + 1}
        </div>

        {/* Status indicator dot */}
        <div
          className={cn(
            "absolute top-1 right-1 h-2 w-2 rounded-full",
            slide.imageStatus === "complete" && "bg-green-500",
            slide.imageStatus === "generating" && "bg-amber-500 animate-pulse",
            slide.imageStatus === "error" && "bg-red-500",
            slide.imageStatus === "pending" && "bg-muted-foreground/50",
          )}
        />
      </div>

      <div className="p-2 bg-background">
        <p className="text-xs font-medium truncate">{slide.title}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {slide.slideType}
        </p>
      </div>
    </button>
  );
}

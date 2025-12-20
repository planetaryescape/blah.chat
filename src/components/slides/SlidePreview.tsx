"use client";

import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2, ZoomIn } from "lucide-react";
import Image from "next/image";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

interface Props {
  slide: Doc<"slides">;
  direction: number;
  onZoom: () => void;
}

export function SlidePreview({ slide, direction, onZoom }: Props) {
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const imageUrl = useQuery(
    api.storage.getUrl,
    slide.imageStorageId
      ? { storageId: slide.imageStorageId as Id<"_storage"> }
      : "skip",
  );

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={slide._id}
        initial={{ opacity: 0, x: direction * 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction * -50 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-4xl"
      >
        {/* Pending State */}
        {slide.imageStatus === "pending" && (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center shadow-lg">
            <p className="text-muted-foreground">Waiting to generate...</p>
          </div>
        )}

        {/* Generating State */}
        {slide.imageStatus === "generating" && (
          <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-4 shadow-lg">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Generating slide...</p>
              <p className="text-sm text-muted-foreground">{slide.title}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {slide.imageStatus === "error" && (
          <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-4 border-2 border-destructive/50 shadow-lg">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="font-medium text-destructive">Generation Failed</p>
              <p className="text-sm text-muted-foreground max-w-md">
                {slide.imageError || "Unknown error occurred"}
              </p>
            </div>
          </div>
        )}

        {/* Complete State - Loading URL */}
        {slide.imageStatus === "complete" && !imageUrl && (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Complete State - Image */}
        {slide.imageStatus === "complete" && imageUrl && (
          <div className="relative group">
            <div className="aspect-video relative rounded-lg overflow-hidden shadow-2xl">
              <Image
                src={imageUrl}
                alt={slide.title}
                fill
                className="object-contain bg-white"
                priority
                sizes="(max-width: 1200px) 100vw, 1200px"
              />

              {/* Zoom button on hover */}
              <button
                type="button"
                onClick={onZoom}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Zoom slide"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

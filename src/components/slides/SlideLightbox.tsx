"use client";

import { useQuery } from "convex/react";
import { Loader2, X } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

interface Props {
  open: boolean;
  onClose: () => void;
  slide: Doc<"slides"> | null;
}

export function SlideLightbox({ open, onClose, slide }: Props) {
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const imageUrl = useQuery(
    api.storage.getUrl,
    slide?.imageStorageId
      ? { storageId: slide.imageStorageId as Id<"_storage"> }
      : "skip",
  );

  // Handle Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!slide) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-none w-screen h-screen max-h-screen p-0 border-0 rounded-none bg-black/95 backdrop-blur-md"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{slide.title}</DialogTitle>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/10"
          aria-label="Close fullscreen view"
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Main content */}
        <div className="flex items-center justify-center w-full h-full p-8">
          {imageUrl ? (
            <div className="relative w-full h-full max-w-7xl">
              <Image
                src={imageUrl}
                alt={slide.title}
                fill
                className="object-contain"
                sizes="95vw"
                priority
              />
            </div>
          ) : (
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          )}
        </div>

        {/* Slide info at bottom */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
          {slide.title}
        </div>
      </DialogContent>
    </Dialog>
  );
}

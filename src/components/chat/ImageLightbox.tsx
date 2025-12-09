"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  images: Array<{ url: string; name: string }>;
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

const ZOOM_LEVELS = [100, 150, 200];

export function ImageLightbox({
  images,
  initialIndex,
  open,
  onClose,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(0); // Index in ZOOM_LEVELS
  const [direction, setDirection] = useState(0);

  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  // Reset zoom when image changes
  useEffect(() => {
    setZoomLevel(0);
  }, [currentIndex]);

  // Update index when initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasMultiple) {
        navigatePrev();
      } else if (e.key === "ArrowRight" && hasMultiple) {
        navigateNext();
      } else if (e.key === "+" || e.key === "=") {
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        zoomOut();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, zoomLevel, hasMultiple]);

  const navigateNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const navigatePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  };

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 1, 0));
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = currentImage.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "!max-w-none w-screen h-screen max-h-screen",
          "p-0 border-0 rounded-none",
          "bg-black/95 backdrop-blur-md",
        )}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Image Viewer</DialogTitle>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Zoom controls */}
        <div className="absolute top-4 right-16 z-50 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            disabled={zoomLevel === 0}
            className="text-white hover:bg-white/10 disabled:opacity-30"
            aria-label="Zoom out"
          >
            <Minus className="w-5 h-5" />
          </Button>
          <div className="flex items-center px-3 text-white text-sm bg-white/10 rounded-md">
            {ZOOM_LEVELS[zoomLevel]}%
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            disabled={zoomLevel === ZOOM_LEVELS.length - 1}
            className="text-white hover:bg-white/10 disabled:opacity-30"
            aria-label="Zoom in"
          >
            <Plus className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="text-white hover:bg-white/10"
            aria-label="Download"
          >
            <Download className="w-5 h-5" />
          </Button>
        </div>

        {/* Image container - scrollable when zoomed */}
        <div className="flex items-center justify-center w-full h-full overflow-auto p-4">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              className="flex items-center justify-center min-w-full min-h-full"
              custom={direction}
              initial={{ opacity: 0, x: direction * 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -100 }}
              transition={{ duration: 0.2 }}
            >
              <img
                src={currentImage.url}
                alt={currentImage.name}
                className="object-contain"
                style={{
                  maxWidth: zoomLevel === 0 ? "100%" : "none",
                  maxHeight: zoomLevel === 0 ? "100%" : "none",
                  width: zoomLevel > 0 ? `${ZOOM_LEVELS[zoomLevel]}%` : "auto",
                  height: zoomLevel > 0 ? "auto" : "auto",
                  transition: "all 0.2s ease-out",
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation arrows */}
        {hasMultiple && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={navigatePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 w-12 h-12"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={navigateNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 w-12 h-12"
              aria-label="Next image"
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          </>
        )}

        {/* Image counter */}
        {hasMultiple && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

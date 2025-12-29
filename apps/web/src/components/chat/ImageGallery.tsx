"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageThumbnail } from "./ImageThumbnail";

interface ImageGalleryItem {
  storageId: string;
  url: string;
  name: string;
}

interface ImageGalleryProps {
  images: ImageGalleryItem[];
  onImageClick: (index: number) => void;
}

const MAX_VISIBLE = 4;

export function ImageGallery({ images, onImageClick }: ImageGalleryProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleImages = showAll ? images : images.slice(0, MAX_VISIBLE);
  const remainingCount = images.length - MAX_VISIBLE;

  return (
    <div className="space-y-2">
      <div
        className={`grid gap-2 ${images.length >= 3 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
      >
        {visibleImages.map((image, index) => (
          <div key={image.storageId}>
            <ImageThumbnail
              url={image.url}
              alt={image.name}
              onClick={() => onImageClick(index)}
            />
          </div>
        ))}
      </div>

      {!showAll && remainingCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full text-xs"
        >
          Show {remainingCount} more {remainingCount === 1 ? "image" : "images"}
        </Button>
      )}
    </div>
  );
}

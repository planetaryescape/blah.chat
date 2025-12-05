"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ImageThumbnail } from "./ImageThumbnail";
import { Button } from "@/components/ui/button";

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
      <motion.div
        className={`grid gap-2 ${images.length >= 3 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
        variants={{
          container: {
            transition: { staggerChildren: 0.05 },
          },
        }}
        initial="container"
        animate="container"
      >
        {visibleImages.map((image, index) => (
          <motion.div
            key={image.storageId}
            variants={{
              container: {
                opacity: 0,
                scale: 0.8,
              },
              item: {
                opacity: 1,
                scale: 1,
              },
            }}
            initial="container"
            animate="item"
            transition={{ duration: 0.2 }}
          >
            <ImageThumbnail
              url={image.url}
              alt={image.name}
              onClick={() => onImageClick(index)}
            />
          </motion.div>
        ))}
      </motion.div>

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

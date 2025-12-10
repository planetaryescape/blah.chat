"use client";

import { useState } from "react";
import { AttachmentIndicators } from "./AttachmentIndicators";
import { ImageGallery } from "./ImageGallery";
import { ImageLightbox } from "./ImageLightbox";

interface AttachmentRendererProps {
  attachments: Array<{
    type: "file" | "image" | "audio";
    name: string;
    storageId: string;
    mimeType: string;
    size: number;
    metadata?: any;
  }>;
  urls: Map<string, string>;
}

export function AttachmentRenderer({
  attachments,
  urls,
}: AttachmentRendererProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Split attachments by type
  const images = attachments.filter((a: any) => a.type === "image");
  const files = attachments.filter((a: any) => a.type !== "image");

  // Prepare images with URLs for gallery and lightbox
  const imagesWithUrls = images
    .map((img: any) => ({
      storageId: img.storageId,
      url: urls.get(img.storageId) || "",
      name: img.name,
    }))
    .filter((img: any) => img.url); // Only include images with valid URLs

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      {imagesWithUrls.length > 0 && (
        <ImageGallery images={imagesWithUrls} onImageClick={handleImageClick} />
      )}

      {files.length > 0 && <AttachmentIndicators attachments={files} />}

      {imagesWithUrls.length > 0 && (
        <ImageLightbox
          images={imagesWithUrls}
          initialIndex={selectedImageIndex}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

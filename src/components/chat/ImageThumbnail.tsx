"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface ImageThumbnailProps {
  url: string;
  alt: string;
  onClick: () => void;
}

export function ImageThumbnail({ url, alt, onClick }: ImageThumbnailProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-md",
        "w-48 h-48 aspect-square",
        "bg-surface-glass border border-border/20",
        "hover:border-border/40 hover:scale-105",
        "transition-all duration-200",
        "cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
      )}
      aria-label={`View ${alt}`}
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-surface-glass animate-pulse" />
      )}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className={cn(
          "w-full h-full object-cover",
          "transition-opacity duration-200",
          isLoaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setIsLoaded(true)}
      />
    </button>
  );
}

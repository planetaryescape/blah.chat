"use client";

import { Image as ImageIcon, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface Attachment {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
  url?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageAttachment({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  return (
    <div className="relative group overflow-hidden rounded-xl w-16 h-16 bg-muted/30 border border-border/30">
      {attachment.url ? (
        <Image
          src={attachment.url}
          alt={attachment.name}
          fill
          sizes="64px"
          className="object-cover transition-transform duration-200 group-hover:scale-110"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Remove button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="absolute top-1 right-1 h-5 w-5 p-0 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
        aria-label={`Remove ${attachment.name}`}
      >
        <X className="w-3 h-3" />
      </Button>

      {/* Size badge */}
      <span className="absolute bottom-1 left-1 text-[10px] text-white/80 bg-black/40 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {formatSize(attachment.size)}
      </span>
    </div>
  );
}

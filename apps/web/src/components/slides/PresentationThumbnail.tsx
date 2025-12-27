"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  storageId: Id<"_storage"> | undefined;
  status: string | undefined;
  title: string;
  className?: string;
  /** Size variant - affects container sizing */
  size?: "card" | "table";
}

export function PresentationThumbnail({
  storageId,
  status,
  title,
  className,
  size = "card",
}: Props) {
  const queryArgs = storageId ? { storageId } : "skip";
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const imageUrl = useQuery(api.storage.getUrl, queryArgs);

  const isGenerating = ["pending", "generating"].includes(status ?? "");
  const hasImage = status === "complete" && imageUrl;

  return (
    <div
      className={cn(
        "relative bg-muted overflow-hidden",
        size === "card"
          ? "aspect-video w-full rounded-t-lg"
          : "h-8 w-12 rounded",
        className,
      )}
    >
      {/* Placeholder/Loading state */}
      {!hasImage && (
        <div className="absolute inset-0 flex items-center justify-center">
          {isGenerating ? (
            <Loader2
              className={cn(
                "animate-spin text-amber-500",
                size === "card" ? "h-8 w-8" : "h-4 w-4",
              )}
            />
          ) : (
            <ImageIcon
              className={cn(
                "text-muted-foreground/40",
                size === "card" ? "h-12 w-12" : "h-4 w-4",
              )}
            />
          )}
        </div>
      )}

      {/* Image */}
      {hasImage && (
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover"
          sizes={size === "card" ? "(max-width: 768px) 100vw, 33vw" : "48px"}
        />
      )}
    </div>
  );
}

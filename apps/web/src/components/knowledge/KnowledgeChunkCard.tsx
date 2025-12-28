"use client";

import { ChevronDown, ChevronUp, Clock, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface KnowledgeChunk {
  _id: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  pageNumber?: number;
  startTime?: string;
  endTime?: string;
}

interface KnowledgeChunkCardProps {
  chunk: KnowledgeChunk;
  sourceType: "file" | "text" | "web" | "youtube";
  isHighlighted?: boolean;
}

export function KnowledgeChunkCard({
  chunk,
  sourceType,
  isHighlighted,
}: KnowledgeChunkCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Auto-expand and scroll to highlighted chunk
  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      setIsExpanded(true);
      setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [isHighlighted]);

  const previewLength = 200;
  const hasMore = chunk.content.length > previewLength;
  const displayContent = isExpanded
    ? chunk.content
    : chunk.content.slice(0, previewLength) + (hasMore ? "..." : "");

  // Format metadata based on source type
  const getMetadataLabel = () => {
    if (sourceType === "youtube" && chunk.startTime) {
      if (chunk.endTime) {
        return `${chunk.startTime} - ${chunk.endTime}`;
      }
      return chunk.startTime;
    }
    if ((sourceType === "file" || sourceType === "web") && chunk.pageNumber) {
      return `Page ${chunk.pageNumber}`;
    }
    return null;
  };

  const metadataLabel = getMetadataLabel();
  const MetadataIcon = sourceType === "youtube" ? Clock : FileText;

  return (
    <div
      ref={cardRef}
      id={`chunk-${chunk._id}`}
      className={cn(
        "border rounded-lg p-3 transition-all duration-300",
        isHighlighted
          ? "ring-2 ring-primary bg-primary/5 border-primary/50"
          : "border-border/50 bg-muted/30 hover:bg-muted/50",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MetadataIcon className="h-3 w-3" />
          <span className="font-medium">Chunk {chunk.chunkIndex + 1}</span>
          {metadataLabel && (
            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
              {metadataLabel}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {chunk.tokenCount} tokens
        </span>
      </div>

      {/* Content */}
      <div
        className={cn(
          "text-sm font-mono bg-background/50 rounded p-2 whitespace-pre-wrap break-words",
          !isExpanded && "line-clamp-4",
        )}
      >
        {displayContent}
      </div>

      {/* Expand/Collapse button */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show more ({chunk.content.length - previewLength} more chars)
            </>
          )}
        </button>
      )}
    </div>
  );
}

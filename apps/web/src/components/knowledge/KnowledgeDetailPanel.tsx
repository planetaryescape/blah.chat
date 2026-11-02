"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SOURCE_ICONS, TYPE_LABELS } from "./constants";
import { KnowledgeChunkCard } from "./KnowledgeChunkCard";
import type { SourceType } from "./types";

interface KnowledgeDetailPanelProps {
  sourceId: Id<"knowledgeSources">;
  highlightChunkId?: Id<"knowledgeChunks"> | null;
  onClose: () => void;
}

export function KnowledgeDetailPanel({
  sourceId,
  highlightChunkId,
  onClose,
}: KnowledgeDetailPanelProps) {
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const sourceData = useQuery(api.knowledgeBank.index.getSourceWithChunks, {
    sourceId,
  });

  if (sourceData === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sourceData === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <AlertCircle className="h-8 w-8" />
        <p>Source not found</p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Indexed";
      case "processing":
        return "Processing...";
      case "failed":
        return "Failed";
      default:
        return "Pending";
    }
  };

  const Icon = SOURCE_ICONS[sourceData.type as SourceType] || FileText;
  const typeLabel = TYPE_LABELS[sourceData.type as SourceType] || "Source";

  return (
    <div className="flex flex-col h-full border-l bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <h2 className="font-medium truncate">{sourceData.title}</h2>
            <p className="text-xs text-muted-foreground">{typeLabel}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 border-b bg-muted/30">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Status</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {getStatusIcon(sourceData.status)}
              <span>{getStatusLabel(sourceData.status)}</span>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Chunks</span>
            <p className="mt-0.5">{sourceData.chunks?.length || 0}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Added</span>
            <p className="mt-0.5">
              {new Date(sourceData.createdAt).toLocaleDateString()}
            </p>
          </div>
          {sourceData.size && (
            <div>
              <span className="text-muted-foreground text-xs">Size</span>
              <p className="mt-0.5">{formatFileSize(sourceData.size)}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-3">
          {sourceData.url && (
            <a
              href={sourceData.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
            >
              <ExternalLink className="h-3 w-3" />
              {sourceData.type === "youtube" ? "Watch Video" : "Visit Page"}
            </a>
          )}
          {sourceData.storageId && (
            <a
              href={`/api/files/${sourceData.storageId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
            >
              <Download className="h-3 w-3" />
              Download
            </a>
          )}
        </div>

        {sourceData.error && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
            {sourceData.error}
          </div>
        )}

        {sourceData.description && (
          <div className="mt-3">
            <span className="text-muted-foreground text-xs">Description</span>
            <p className="mt-0.5 text-sm">{sourceData.description}</p>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="p-4 space-y-3">
          {sourceData.chunks && sourceData.chunks.length > 0 ? (
            <>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Content Chunks ({sourceData.chunks.length})
              </h3>
              {sourceData.chunks.map((chunk: any) => (
                <KnowledgeChunkCard
                  key={chunk._id}
                  chunk={chunk}
                  sourceType={sourceData.type as SourceType}
                  isHighlighted={highlightChunkId === chunk._id}
                />
              ))}
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No content chunks available</p>
              <p className="text-xs mt-1">
                {sourceData.status === "pending"
                  ? "Source is waiting to be processed"
                  : sourceData.status === "processing"
                    ? "Source is being processed..."
                    : "Processing may have failed"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

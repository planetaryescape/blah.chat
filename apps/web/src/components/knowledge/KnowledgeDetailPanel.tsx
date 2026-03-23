"use client";

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
import { useKnowledgeSourceDetail } from "@/hooks/useKnowledgeSources";
import { SOURCE_ICONS, TYPE_LABELS } from "./constants";
import { KnowledgeChunkCard } from "./KnowledgeChunkCard";
import type { SourceType } from "./types";

interface KnowledgeDetailPanelProps {
  sourceId: string;
  highlightChunkId?: string | null;
  onClose: () => void;
}

export function KnowledgeDetailPanel({
  sourceId,
  highlightChunkId,
  onClose,
}: KnowledgeDetailPanelProps) {
  const { data: sourceData, isLoading } = useKnowledgeSourceDetail(sourceId);

  if (isLoading) {
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

  if (!sourceData) {
    return null;
  }

  const source = sourceData;

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

  const Icon = SOURCE_ICONS[source.type as SourceType] || FileText;
  const typeLabel = TYPE_LABELS[source.type as SourceType] || "Source";

  return (
    <div className="flex flex-col h-full border-l bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <h2 className="font-medium truncate">{source.title}</h2>
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
              {getStatusIcon(source.status)}
              <span>{getStatusLabel(source.status)}</span>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Chunks</span>
            <p className="mt-0.5">{source.chunks?.length || 0}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Added</span>
            <p className="mt-0.5">
              {new Date(source.createdAt).toLocaleDateString()}
            </p>
          </div>
          {source.size && (
            <div>
              <span className="text-muted-foreground text-xs">Size</span>
              <p className="mt-0.5">{formatFileSize(source.size)}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-3">
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
            >
              <ExternalLink className="h-3 w-3" />
              {source.type === "youtube" ? "Watch Video" : "Visit Page"}
            </a>
          )}
          {source.storageId && (
            <a
              href={`/api/v1/files/${source.storageId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
            >
              <Download className="h-3 w-3" />
              Download
            </a>
          )}
        </div>

        {source.error && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
            {source.error}
          </div>
        )}

        {source.description && (
          <div className="mt-3">
            <span className="text-muted-foreground text-xs">Description</span>
            <p className="mt-0.5 text-sm">{source.description}</p>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="p-4 space-y-3">
          {source.chunks && source.chunks.length > 0 ? (
            <>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Content Chunks ({source.chunks.length})
              </h3>
              {source.chunks.map((chunk: any) => (
                <KnowledgeChunkCard
                  key={chunk._id}
                  chunk={chunk}
                  sourceType={source.type as SourceType}
                  isHighlighted={highlightChunkId === chunk._id}
                />
              ))}
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No content chunks available</p>
              <p className="text-xs mt-1">
                {source.status === "pending"
                  ? "Source is waiting to be processed"
                  : source.status === "processing"
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

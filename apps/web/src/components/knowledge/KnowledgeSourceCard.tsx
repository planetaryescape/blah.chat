"use client";

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  BookOpen,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Youtube,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SourceType = "file" | "text" | "web" | "youtube";
type SourceStatus = "pending" | "processing" | "completed" | "failed";

interface KnowledgeSource {
  _id: Id<"knowledgeSources">;
  title: string;
  type: SourceType;
  status: SourceStatus;
  chunkCount?: number;
  url?: string;
  createdAt: number;
}

interface KnowledgeSourceCardProps {
  source: KnowledgeSource;
  isSelected: boolean;
  onClick: () => void;
}

const SOURCE_ICONS = {
  file: FileText,
  text: BookOpen,
  web: Globe,
  youtube: Youtube,
};

const STATUS_STYLES = {
  pending: "bg-yellow-500/10 text-yellow-500",
  processing: "bg-blue-500/10 text-blue-500",
  completed: "bg-green-500/10 text-green-500",
  failed: "bg-red-500/10 text-red-500",
};

export function KnowledgeSourceCard({
  source,
  isSelected,
  onClick,
}: KnowledgeSourceCardProps) {
  const Icon = SOURCE_ICONS[source.type];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        "hover:bg-accent/50",
        isSelected
          ? "bg-accent border-primary/50 ring-1 ring-primary/30"
          : "bg-card border-border/50",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{source.title}</span>
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] px-1.5 py-0",
                STATUS_STYLES[source.status],
              )}
            >
              {source.status === "processing" && (
                <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
              )}
              {source.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {source.chunkCount !== undefined && source.chunkCount > 0 && (
              <span>{source.chunkCount} chunks</span>
            )}
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-0.5 hover:underline"
              >
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            <span className="text-muted-foreground/70">
              {formatDistanceToNow(source.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

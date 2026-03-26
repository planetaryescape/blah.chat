"use client";

import { ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { SOURCE_ICONS, STATUS_STYLES } from "@/components/knowledge/constants";
import type { KnowledgeSource } from "@/components/knowledge/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function KnowledgeSourceRow({
  source,
  onDelete,
  onReprocess,
}: {
  source: KnowledgeSource;
  onDelete: (sourceId: string) => void;
  onReprocess: (sourceId: string) => void;
}) {
  const Icon = SOURCE_ICONS[source.type];

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{source.title}</span>
          <Badge variant="secondary" className={STATUS_STYLES[source.status]}>
            {source.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span className="capitalize">{source.type}</span>
          {source.chunkCount && (
            <>
              <span>·</span>
              <span>{source.chunkCount} chunks</span>
            </>
          )}
          {source.url && (
            <>
              <span>·</span>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Link
              </a>
            </>
          )}
        </div>
        {source.error && (
          <p className="mt-1 text-xs text-destructive">{source.error}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {source.status === "failed" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onReprocess(source._id)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(source._id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

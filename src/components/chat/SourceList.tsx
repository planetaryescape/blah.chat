"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";

interface SourceListProps {
  messageId: Id<"messages">;
  className?: string;
}

export function SourceList({ messageId, className }: SourceListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if this is a temporary optimistic message (not yet persisted)
  const isTempMessage = typeof messageId === "string" && messageId.startsWith("temp-");

  // Fetch sources from normalized tables (Phase 2 migration complete)
  // Skip query for temporary optimistic messages
  const sources = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query
    api.sources.operations.getSources,
    isTempMessage ? "skip" : { messageId }
  );

  // Hide if no sources
  if (!sources || sources.length === 0) return null;

  const count = sources.length;

  return (
    <div className={cn("mt-4 space-y-2", className)}>
      {/* Toggle Button - Perplexity Style */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        <span>
          Used {count} {count === 1 ? "source" : "sources"}
        </span>
      </Button>

      {/* Expandable Sources Grid */}
      {isExpanded && (
        <div className="grid gap-2 sm:grid-cols-2">
          {sources.map((source, idx) => (
            <SourceCard
              key={source.position || idx}
              source={source}
              position={source.position || idx + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SourceCardProps {
  source: any; // Type from Convex query
  position: number;
}

function SourceCard({ source, position }: SourceCardProps) {
  // Prefer enriched OG title over provider title
  const displayTitle = source.metadata?.title || source.title || source.url;
  const snippet = source.snippet || source.metadata?.description || "";
  const favicon = source.metadata?.favicon;

  let domain: string;
  try {
    domain = new URL(source.url).hostname.replace("www.", "");
  } catch {
    domain = source.url;
  }

  const card = (
    <Card className="group relative overflow-hidden p-3 transition-all hover:border-primary/50 hover:shadow-md cursor-pointer">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3"
        onClick={(e) => {
          // Let hover card handle desktop, direct link for mobile
          if (window.innerWidth < 640) {
            return; // Allow default link behavior
          }
        }}
      >
        {/* Citation Number Badge */}
        <Badge
          variant="secondary"
          className="h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 text-xs font-semibold"
        >
          {position}
        </Badge>

        <div className="min-w-0 flex-1 space-y-1">
          {/* Favicon + Domain */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {favicon && (
              <img
                src={favicon}
                alt=""
                className="h-4 w-4 rounded"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <span className="truncate">{domain}</span>
          </div>

          {/* Title */}
          <h4 className="line-clamp-2 text-sm font-medium leading-tight group-hover:underline">
            {displayTitle}
          </h4>

          {/* Snippet */}
          {snippet && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {snippet.slice(0, 120)}
              {snippet.length > 120 ? "..." : ""}
            </p>
          )}
        </div>

        {/* External Link Icon */}
        <div className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <ExternalLink className="h-4 w-4" />
        </div>
      </a>
    </Card>
  );

  // Desktop: wrap in hover card for preview
  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>{card}</HoverCardTrigger>
      <HoverCardContent side="top" className="w-80">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{domain}</p>
          <h4 className="font-semibold">{displayTitle}</h4>
          {snippet && (
            <p className="text-sm text-muted-foreground">{snippet}</p>
          )}
          <Button asChild size="sm" variant="outline" className="w-full gap-2">
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              Open source
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

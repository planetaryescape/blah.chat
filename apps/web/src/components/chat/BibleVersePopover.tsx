"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useBibleVerse } from "@/hooks/useBibleVerse";
import { osisToDisplay, osisToGatewayUrl } from "@/lib/bible/utils";

interface BibleVersePopoverProps {
  osis: string;
  enabled?: boolean;
}

export function BibleVersePopover({
  osis,
  enabled = true,
}: BibleVersePopoverProps) {
  const { verse, loading, error } = useBibleVerse(osis, enabled);
  const displayRef = verse?.reference || osisToDisplay(osis);
  const gatewayUrl = osisToGatewayUrl(osis);

  if (loading) {
    return (
      <div className="bible-verse-popover">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading verse...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bible-verse-popover">
        <p className="verse-reference">{displayRef}</p>
        <p className="text-sm text-muted-foreground mb-2">
          Unable to load verse text
        </p>
        <a
          href={gatewayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="verse-link inline-flex items-center gap-1 text-primary hover:underline"
        >
          Read on BibleGateway
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="bible-verse-popover">
      <p className="verse-reference">{displayRef}</p>
      <p className="verse-text">{verse?.text}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-muted-foreground">
          {verse?.version || "WEB"}
        </span>
        <a
          href={gatewayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="verse-link inline-flex items-center gap-1 text-primary hover:underline text-sm"
        >
          Read more
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

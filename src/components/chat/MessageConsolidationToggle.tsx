"use client";

import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { ComparisonView } from "./ComparisonView";

interface MessageConsolidationToggleProps {
  originalResponses: Doc<"messages">[];
  showOriginals: boolean;
  onToggle: () => void;
}

/**
 * Toggle for consolidated messages to show/hide original responses.
 * Displays a collapsible section with the original AI responses.
 */
export function MessageConsolidationToggle({
  originalResponses,
  showOriginals,
  onToggle,
}: MessageConsolidationToggleProps) {
  if (originalResponses.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border/10 pt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="gap-2 text-xs"
      >
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform",
            showOriginals && "rotate-180"
          )}
        />
        {showOriginals ? "Hide" : "Show"} original {originalResponses.length}{" "}
        response{originalResponses.length !== 1 ? "s" : ""}
      </Button>

      {showOriginals && (
        <div className="mt-4">
          <ComparisonView
            assistantMessages={originalResponses}
            comparisonGroupId={originalResponses[0]?.comparisonGroupId || ""}
            showModelNames={true}
            onVote={() => {}}
            onConsolidate={() => {}}
            onToggleModelNames={() => {}}
            hideConsolidateButton={true}
          />
        </div>
      )}
    </div>
  );
}

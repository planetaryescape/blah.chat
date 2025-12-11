"use client";

import { useAction } from "convex/react";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface SummarizePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  sourceMessageId: Id<"messages">;
  position: { top: number; left: number };
  onSaveAsNote: (summary: string) => void;
}

export function SummarizePopover({
  open,
  onOpenChange,
  selectedText,
  sourceMessageId,
  position,
  onSaveAsNote,
}: SummarizePopoverProps) {
  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const summarizeSelection = useAction(api.generation.summarizeSelection);

  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate summary when popover opens
  const generateSummary = async () => {
    // Validate text length (max ~10k characters)
    if (selectedText.length > 10000) {
      setError(
        "Selection too long. Please select less than 10,000 characters.",
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary("");

    try {
      const result = await summarizeSelection({ text: selectedText });
      setSummary(result.summary);
    } catch (err) {
      console.error("Failed to generate summary:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate summary";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && selectedText) {
      generateSummary();
    }
  }, [open, selectedText]);

  const handleSaveAsNote = () => {
    onSaveAsNote(summary);
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {/* Invisible trigger positioned at selection */}
      <PopoverTrigger asChild>
        <div
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      </PopoverTrigger>

      <PopoverContent
        className="w-80"
        side="bottom"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : error ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
            <Button size="sm" onClick={generateSummary} className="w-full">
              Try Again
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">{summary}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveAsNote}>
                Save as Note
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Dismiss
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

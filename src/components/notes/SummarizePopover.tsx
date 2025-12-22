"use client";

import { useAction } from "convex/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";

// Constants
const MAX_TEXT_LENGTH = 10000;

interface SummarizePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  position: { top: number; left: number };
  onSaveAsNote: (summary: string) => void;
}

export function SummarizePopover({
  open,
  onOpenChange,
  selectedText,
  onSaveAsNote,
}: SummarizePopoverProps) {
  // @ts-expect-error - Type depth exceeded with complex Convex action (94+ modules)
  const summarizeSelectionAction = useAction(api.generation.summarizeSelection);

  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate summary when popover opens
  useEffect(() => {
    if (!open || !selectedText) return;

    const generateSummary = async () => {
      // Validate text length
      if (selectedText.length > MAX_TEXT_LENGTH) {
        setError(
          `Selection too long. Please select less than ${MAX_TEXT_LENGTH.toLocaleString()} characters.`
        );
        return;
      }

      setIsLoading(true);
      setError(null);
      setSummary("");

      try {
        const result = (await (summarizeSelectionAction as any)({
          text: selectedText,
        })) as { summary: string };
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

    generateSummary();
  }, [open, selectedText, summarizeSelectionAction]);

  const handleSaveAsNote = () => {
    onSaveAsNote(summary);
    // Don't call onOpenChange(false) - let parent handle closing
  };

  const handleRetry = () => {
    setError(null);
    // Re-trigger the effect by toggling state
    setIsLoading(true);
    setError(null);
    setSummary("");

    const retry = async () => {
      try {
        const result = (await (summarizeSelectionAction as any)({
          text: selectedText,
        })) as { summary: string };
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

    retry();
  };

  const handleClose = () => {
    onOpenChange(false);
    clearSelection();
  };

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-80 sm:max-w-md"
        onEscapeKeyDown={handleClose}
        onInteractOutside={handleClose}
        showCloseButton={false}
      >
        {/* Screen reader title */}
        <DialogTitle className="sr-only">Text Summary</DialogTitle>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <DialogDescription className="text-sm text-muted-foreground">
              Generating summary...
            </DialogDescription>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button size="sm" onClick={handleRetry} className="w-full">
              Try Again
            </Button>
          </div>
        )}

        {/* Success State - Show Summary */}
        {!isLoading && !error && summary && (
          <>
            <DialogDescription className="text-sm text-muted-foreground select-text">
              {summary}
            </DialogDescription>
            <DialogFooter className="flex-row gap-2 sm:gap-2">
              <Button size="sm" onClick={handleSaveAsNote}>
                Save as Note
              </Button>
              <Button size="sm" variant="ghost" onClick={handleClose}>
                Dismiss
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

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
import { useAsyncAction } from "@/hooks/useAsyncAction";

const MAX_TEXT_LENGTH = 10000;

interface SummarizePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  position: { top: number; left: number };
  onSaveAsNote: (summary: string) => void;
}

async function summarizeText(text: string): Promise<{ summary: string }> {
  const response = await fetch("/api/v1/actions/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || "Failed to generate summary",
    );
  }

  const payload = (await response.json()) as { data?: { summary: string } };
  return payload.data ?? { summary: "" };
}

export function SummarizePopover({
  open,
  onOpenChange,
  selectedText,
  onSaveAsNote,
}: SummarizePopoverProps) {
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { run: generateSummary, isPending: isLoading } = useAsyncAction(
    async () => {
      if (selectedText.length > MAX_TEXT_LENGTH) {
        setError(
          `Selection too long. Please select less than ${MAX_TEXT_LENGTH.toLocaleString()} characters.`,
        );
        return;
      }

      setError(null);
      setSummary("");

      const result = await summarizeText(selectedText);
      setSummary(result.summary);
    },
    {
      onError: (err) => {
        console.error("Failed to generate summary:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to generate summary";
        setError(errorMessage);
      },
    },
  );

  useEffect(() => {
    if (!open || !selectedText) return;
    generateSummary();
  }, [open, selectedText]);

  const handleSaveAsNote = () => {
    onSaveAsNote(summary);
  };

  const handleRetry = () => {
    generateSummary();
  };

  const handleClose = () => {
    onOpenChange(false);
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
        <DialogTitle className="sr-only">Text Summary</DialogTitle>

        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <DialogDescription className="text-sm text-muted-foreground">
              Generating summary...
            </DialogDescription>
          </div>
        )}

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

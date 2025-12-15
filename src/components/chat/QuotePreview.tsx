"use client";

import { Button } from "@/components/ui/button";
import { Quote, X } from "lucide-react";

interface QuotePreviewProps {
  quote: string;
  onDismiss: () => void;
}

/**
 * Preview component for quoted/replied text in the chat input.
 */
export function QuotePreview({ quote, onDismiss }: QuotePreviewProps) {
  return (
    <div className="mx-2 mt-2 p-3 rounded-xl bg-muted/50 dark:bg-white/5 border border-border/50 dark:border-white/10 flex items-start gap-3 group relative">
      <div className="shrink-0 mt-0.5">
        <Quote className="w-4 h-4 text-primary/70" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/90 line-clamp-3 leading-relaxed font-medium">
          {quote}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 -mr-1 -mt-1 opacity-60 group-hover:opacity-100 transition-opacity"
        onClick={onDismiss}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

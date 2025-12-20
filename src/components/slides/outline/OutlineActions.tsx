"use client";

import { Button } from "@/components/ui/button";
import { Check, Loader2, RefreshCw, RotateCcw } from "lucide-react";

interface OutlineActionsProps {
  hasFeedback: boolean;
  isSubmitting: boolean;
  isApproving: boolean;
  isGenerating: boolean;
  canApprove: boolean;
  onSubmitFeedback: () => void;
  onApprove: () => void;
  // Post-generation mode props
  isPostGeneration?: boolean;
  isRegenerating?: boolean;
  canRegenerate?: boolean;
  onRegenerateSlides?: () => void;
}

export function OutlineActions({
  hasFeedback,
  isSubmitting,
  isApproving,
  isGenerating,
  canApprove,
  onSubmitFeedback,
  onApprove,
  isPostGeneration = false,
  isRegenerating = false,
  canRegenerate = false,
  onRegenerateSlides,
}: OutlineActionsProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Submit Feedback Button */}
      <Button
        variant="outline"
        onClick={onSubmitFeedback}
        disabled={!hasFeedback || isSubmitting || isApproving || isGenerating || isRegenerating}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Regenerating...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Submit Feedback
          </>
        )}
      </Button>

      {/* Approve or Regenerate Button based on mode */}
      {isPostGeneration ? (
        <Button
          onClick={onRegenerateSlides}
          disabled={!canRegenerate || isSubmitting || isRegenerating || isGenerating}
          variant="default"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Regenerate Slides
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={onApprove}
          disabled={!canApprove || isSubmitting || isApproving || isGenerating}
        >
          {isApproving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Approving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Approve & Generate
            </>
          )}
        </Button>
      )}
    </div>
  );
}

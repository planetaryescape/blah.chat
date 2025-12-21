"use client";

import { useMutation } from "convex/react";
import { Check, Loader2, Pencil, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useUserPreference } from "@/hooks/useUserPreference";
import { RegenerateSlideModal } from "./RegenerateSlideModal";

interface Props {
  slide: Doc<"slides">;
  slideNumber: number;
  totalSlides: number;
}

export function SlideDetails({ slide, slideNumber, totalSlides }: Props) {
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [speakerNotes, setSpeakerNotes] = useState(slide.speakerNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const showStats = useUserPreference("showSlideStatistics");

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const updateSlideContent = useMutation(api.presentations.updateSlideContent);

  // Sync state when slide changes
  useEffect(() => {
    setSpeakerNotes(slide.speakerNotes || "");
    setIsEditingNotes(false);
  }, [slide.speakerNotes]);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await updateSlideContent({
        slideId: slide._id,
        speakerNotes: speakerNotes,
      });
      toast.success("Speaker notes saved");
      setIsEditingNotes(false);
    } catch (error) {
      toast.error("Failed to save speaker notes");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setSpeakerNotes(slide.speakerNotes || "");
    setIsEditingNotes(false);
  };

  const canRegenerate =
    slide.imageStatus === "error" || slide.imageStatus === "complete";
  const isGenerating =
    slide.imageStatus === "generating" || slide.imageStatus === "pending";
  const statusVariant =
    slide.imageStatus === "complete"
      ? "secondary"
      : slide.imageStatus === "error"
        ? "destructive"
        : "secondary";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Slide {slideNumber} of {totalSlides}
          </span>
          <Badge variant="secondary" className="capitalize">
            {slide.slideType}
          </Badge>
        </div>
        <h2 className="text-xl font-semibold">{slide.title}</h2>
      </div>

      <Separator />

      {/* Content */}
      {slide.content && (
        <div>
          <h3 className="text-sm font-medium mb-2">Content</h3>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {slide.content}
          </div>
        </div>
      )}

      {/* Speaker Notes - Editable */}

      <Separator />
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Speaker Notes</h3>
          {!isEditingNotes && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setIsEditingNotes(true)}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
        {isEditingNotes ? (
          <div className="space-y-2">
            <Textarea
              value={speakerNotes}
              onChange={(e) => setSpeakerNotes(e.target.value)}
              placeholder="Add speaker notes..."
              className="min-h-[100px] max-h-[200px] overflow-auto text-sm resize-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveNotes} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Check className="h-3 w-3 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {slide.speakerNotes || (
              <span className="italic text-muted-foreground/60">
                No speaker notes yet. Click Edit to add some.
              </span>
            )}
          </p>
        )}
      </div>

      <Separator />

      {/* Metadata */}
      <div>
        <h3 className="text-sm font-medium mb-3">Generation Info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={statusVariant} className="capitalize">
              {slide.imageStatus}
            </Badge>
          </div>

          {showStats &&
            slide.generationCost !== undefined &&
            slide.generationCost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost</span>
                <span className="font-mono">
                  ${slide.generationCost.toFixed(4)}
                </span>
              </div>
            )}

          {showStats &&
            slide.inputTokens !== undefined &&
            slide.inputTokens > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tokens</span>
                <span className="font-mono text-xs">
                  {slide.inputTokens.toLocaleString()} in /{" "}
                  {(slide.outputTokens || 0).toLocaleString()} out
                </span>
              </div>
            )}
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          disabled={!canRegenerate || isGenerating}
          onClick={() => setRegenerateOpen(true)}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate Slide
            </>
          )}
        </Button>
        {slide.imageStatus === "error" && slide.imageError && (
          <p className="text-xs text-destructive text-center">
            {slide.imageError}
          </p>
        )}
      </div>

      {/* Regenerate Modal */}
      <RegenerateSlideModal
        slide={slide}
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
      />
    </div>
  );
}

"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  slide: Doc<"slides">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegenerateSlideModal({ slide, open, onOpenChange }: Props) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const regenerateSlide = useMutation(api.presentations.regenerateSlideImage);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const imageUrl = useQuery(
    api.storage.getUrl,
    slide.imageStorageId ? { storageId: slide.imageStorageId } : "skip",
  );

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      await regenerateSlide({
        slideId: slide._id,
        customPrompt: customPrompt.trim() || undefined,
      });
      onOpenChange(false);
      setCustomPrompt("");
    } catch (error) {
      console.error("Regeneration error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Slide</DialogTitle>
          <DialogDescription>
            Describe what to change, or leave empty to regenerate fresh.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Slide Preview */}
          <div>
            <Label className="text-sm font-medium">Current Slide</Label>
            <div className="mt-2 aspect-video bg-muted rounded-lg overflow-hidden relative">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={slide.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No image
                </div>
              )}
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <Label htmlFor="customPrompt">Custom Instructions (Optional)</Label>
            <Textarea
              id="customPrompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="E.g., 'Make this slide more visual', 'Use warmer colors', 'Add more whitespace'..."
              rows={3}
              className="mt-2"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to regenerate with the same style.
            </p>
          </div>

          {/* Cost info */}
          {slide.generationCost !== undefined && slide.generationCost > 0 && (
            <p className="text-xs text-muted-foreground">
              Previous cost: ${slide.generationCost.toFixed(4)}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleRegenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

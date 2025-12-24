"use client";

import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface OutlineSlideEditorProps {
  item: Doc<"outlineItems">;
  index: number;
  onFeedbackChange: (itemId: Id<"outlineItems">, feedback: string) => void;
}

const slideTypeLabels: Record<string, string> = {
  title: "Title Slide",
  section: "Section Header",
  content: "Content Slide",
};

const slideTypeColors: Record<string, string> = {
  title: "bg-primary/10 text-primary border-primary/20",
  section:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  content: "bg-muted text-muted-foreground border-muted-foreground/20",
};

export function OutlineSlideEditor({
  item,
  index,
  onFeedbackChange,
}: OutlineSlideEditorProps) {
  const [localFeedback, setLocalFeedback] = useState(item.feedback || "");
  const [showFeedback, setShowFeedback] = useState(!!item.feedback);

  // Sync state when item changes
  useEffect(() => {
    setLocalFeedback(item.feedback || "");
    setShowFeedback(!!item.feedback);
  }, [item._id, item.feedback]);

  const handleFeedbackBlur = () => {
    if (localFeedback !== item.feedback) {
      onFeedbackChange(item._id, localFeedback);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-mono text-sm">
            {index + 1}
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-normal",
              slideTypeColors[item.slideType],
            )}
          >
            {slideTypeLabels[item.slideType]}
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-2", showFeedback && "text-primary bg-primary/5")}
          onClick={() => setShowFeedback(!showFeedback)}
        >
          <MessageSquare className="h-4 w-4" />
          {showFeedback ? "Hide Feedback" : "Add Feedback"}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-8 space-y-8">
          {/* Slide Preview Card (Visual approximation) */}
          <div className="aspect-[16/9] bg-card border rounded-xl shadow-sm p-8 sm:p-12 flex flex-col relative overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-muted/5 pointer-events-none" />

            <div className="relative z-10 flex-1 flex flex-col">
              {/* Content */}
              <div className="space-y-6">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                  {item.title || (
                    <span className="text-muted-foreground italic">
                      Untitled Slide
                    </span>
                  )}
                </h1>

                {item.content && (
                  <div className="prose prose-lg dark:prose-invert text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {item.content}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Speaker Notes */}
          <div className="bg-muted/30 rounded-lg border p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Speaker Notes
            </h4>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {item.speakerNotes || (
                <span className="text-muted-foreground italic">
                  No speaker notes provided.
                </span>
              )}
            </p>
          </div>

          {/* Feedback Area */}
          {showFeedback && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary font-medium text-sm">
                  <MessageSquare className="h-4 w-4" />
                  Correction / Feedback
                </div>
                <Textarea
                  value={localFeedback}
                  onChange={(e) => setLocalFeedback(e.target.value)}
                  onBlur={handleFeedbackBlur}
                  placeholder="Tell the AI what to change about this slide (e.g. 'Make the title more punchy', 'Add a bullet point about X')..."
                  className="bg-background min-h-[100px] resize-none focus-visible:ring-primary/30"
                />
                <p className="text-xs text-muted-foreground">
                  Feedback will be used to regenerate this slide's content.
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

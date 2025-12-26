"use client";

import { useMutation } from "convex/react";
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface OutlineSlideEditorProps {
  item: Doc<"outlineItems">;
  index: number;
  onFeedbackChange: (itemId: Id<"outlineItems">, feedback: string) => void;
  aspectRatio?: "16:9" | "1:1" | "9:16";
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
  aspectRatio = "16:9",
}: OutlineSlideEditorProps) {
  // Content editing state
  const [localTitle, setLocalTitle] = useState(item.title || "");
  const [localContent, setLocalContent] = useState(item.content || "");
  const [localNotes, setLocalNotes] = useState(item.speakerNotes || "");
  const [localFeedback, setLocalFeedback] = useState(item.feedback || "");
  const [showFeedback, setShowFeedback] = useState(!!item.feedback);

  // @ts-ignore - Type depth exceeded
  const updateContent = useMutation(api.outlineItems.updateContent);

  // Format-aware: social formats (1:1, 9:16) have simplified UI
  const isSocial = aspectRatio === "1:1" || aspectRatio === "9:16";
  const notesLabel = aspectRatio === "16:9" ? "Speaker Notes" : "Caption";
  const notesPlaceholder =
    aspectRatio === "16:9"
      ? "Add speaker notes..."
      : "Add caption for this slide...";

  // Sync state when item changes
  useEffect(() => {
    setLocalTitle(item.title || "");
    setLocalContent(item.content || "");
    setLocalNotes(item.speakerNotes || "");
    setLocalFeedback(item.feedback || "");
    setShowFeedback(!!item.feedback);
  }, [item._id, item.title, item.content, item.speakerNotes, item.feedback]);

  const handleTitleBlur = () => {
    if (localTitle !== item.title) {
      updateContent({ outlineItemId: item._id, title: localTitle });
    }
  };

  const handleContentBlur = () => {
    if (localContent !== item.content) {
      updateContent({ outlineItemId: item._id, content: localContent });
    }
  };

  const handleNotesBlur = () => {
    if (localNotes !== item.speakerNotes) {
      updateContent({ outlineItemId: item._id, speakerNotes: localNotes });
    }
  };

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
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Editable Content Form */}
          <div className="space-y-5">
            {/* Title - only for presentations */}
            {!isSocial && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Title{" "}
                  <span className="text-muted-foreground/60">(optional)</span>
                </Label>
                <Input
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  placeholder="Enter slide title..."
                  className="text-lg font-semibold"
                />
              </div>
            )}

            {/* Content - always shown, larger for social */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isSocial ? "Slide Text" : "Content"}
              </Label>
              <Textarea
                value={isSocial ? localTitle : localContent}
                onChange={(e) =>
                  isSocial
                    ? setLocalTitle(e.target.value)
                    : setLocalContent(e.target.value)
                }
                onBlur={isSocial ? handleTitleBlur : handleContentBlur}
                placeholder={
                  isSocial
                    ? "Enter your slide text..."
                    : "Enter slide content (use - for bullet points)..."
                }
                className={cn(
                  "resize-none",
                  isSocial ? "min-h-[200px]" : "min-h-[140px]",
                )}
              />
            </div>

            {/* Speaker Notes - only for presentations */}
            {!isSocial && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {notesLabel}
                </Label>
                <Textarea
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder={notesPlaceholder}
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>
            )}
          </div>

          {/* Feedback Area */}
          {showFeedback && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary font-medium text-sm">
                  <MessageSquare className="h-4 w-4" />
                  Feedback for AI Regeneration
                </div>
                <Textarea
                  value={localFeedback}
                  onChange={(e) => setLocalFeedback(e.target.value)}
                  onBlur={handleFeedbackBlur}
                  placeholder="Tell the AI what to change (e.g. 'Make the title more punchy', 'Add a bullet about X')..."
                  className="bg-background min-h-[100px] resize-none focus-visible:ring-primary/30"
                />
                <p className="text-xs text-muted-foreground">
                  Feedback is used when regenerating this slide. For direct
                  edits, modify the fields above.
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

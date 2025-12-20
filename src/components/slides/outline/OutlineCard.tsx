"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface OutlineCardProps {
  item: Doc<"outlineItems">;
  index: number;
  onFeedbackChange: (itemId: Id<"outlineItems">, feedback: string) => void;
}

const slideTypeLabels: Record<string, string> = {
  title: "Title",
  section: "Section",
  content: "Content",
};

const slideTypeColors: Record<string, string> = {
  title: "bg-primary/20 text-primary border-primary/30",
  section:
    "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  content: "bg-muted text-muted-foreground border-muted-foreground/30",
};

export function OutlineCard({
  item,
  index,
  onFeedbackChange,
}: OutlineCardProps) {
  const [showFeedback, setShowFeedback] = useState(!!item.feedback);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [localFeedback, setLocalFeedback] = useState(item.feedback || "");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleFeedbackBlur = () => {
    if (localFeedback !== item.feedback) {
      onFeedbackChange(item._id, localFeedback);
    }
  };

  const hasFeedback = !!item.feedback || !!localFeedback;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border rounded-lg overflow-hidden transition-all",
        isDragging && "opacity-50 shadow-2xl z-50",
        hasFeedback && "border-l-4 border-l-primary",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 bg-muted/50 border-b",
          "cursor-grab active:cursor-grabbing",
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-muted-foreground">
          {index + 1}
        </span>
        <Badge
          variant="outline"
          className={cn("text-xs", slideTypeColors[item.slideType])}
        >
          {slideTypeLabels[item.slideType]}
        </Badge>
        {hasFeedback && (
          <MessageSquare className="h-3.5 w-3.5 text-primary ml-auto" />
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-base leading-tight">{item.title}</h3>

        {/* Bullets/Content */}
        {item.content && (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {item.content}
          </div>
        )}

        {/* Speaker Notes (collapsible) */}
        {item.speakerNotes && (
          <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {notesExpanded ? (
                  <ChevronUp className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                Speaker Notes
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
                {item.speakerNotes}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Feedback Section */}
      <div className="border-t px-4 py-3">
        {!showFeedback ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => setShowFeedback(true)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Add feedback for this slide...
          </Button>
        ) : (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Feedback for this slide
            </label>
            <Textarea
              value={localFeedback}
              onChange={(e) => setLocalFeedback(e.target.value)}
              onBlur={handleFeedbackBlur}
              placeholder="Suggest changes, additions, or improvements..."
              className="min-h-[80px] text-sm resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}

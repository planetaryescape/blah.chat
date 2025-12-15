"use client";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
    FeedbackType,
    PRIORITY_CONFIG,
    Priority,
    STATUS_COLORS,
    STATUS_LABELS,
    TYPE_CONFIG,
} from "@/lib/constants/feedback";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface FeedbackListProps {
  items: Doc<"feedback">[];
  selectedId: Id<"feedback"> | null;
  onSelect: (id: Id<"feedback">) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  isSelectionMode: boolean;
}

export function FeedbackList({
  items,
  selectedId,
  onSelect,
  selectedIds,
  onToggleSelection,
  isSelectionMode,
}: FeedbackListProps) {
  return (
    <div className="divide-y">
      {items.map((item) => (
        <div
          key={item._id}
          className={cn(
            "flex items-start gap-2 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
            selectedId === item._id && "bg-muted",
            selectedIds.has(item._id) && "bg-primary/5"
          )}
        >
          {/* Checkbox */}
          <Checkbox
            checked={selectedIds.has(item._id)}
            onCheckedChange={() => onToggleSelection(item._id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 shrink-0"
          />

          {/* Content - clickable to view details */}
          <button
            onClick={() => onSelect(item._id)}
            className="flex-1 text-left min-w-0"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium truncate block">{item.userName}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                {formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {item.description}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-5 font-normal border-0",
                  TYPE_CONFIG[item.feedbackType as FeedbackType].color
                )}
              >
                {TYPE_CONFIG[item.feedbackType as FeedbackType].icon}
                <span className="ml-1">
                  {TYPE_CONFIG[item.feedbackType as FeedbackType].label}
                </span>
              </Badge>

              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-5 font-normal border",
                  STATUS_COLORS[item.status]
                )}
              >
                {STATUS_LABELS[item.status] || item.status}
              </Badge>

              {item.priority !== "none" && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-5 font-normal border",
                    PRIORITY_CONFIG[item.priority as Priority]?.color
                  )}
                >
                  {PRIORITY_CONFIG[item.priority as Priority]?.label}
                </Badge>
              )}
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}

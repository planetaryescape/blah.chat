"use client";

import { formatDistanceToNow } from "date-fns";
import { Pin } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";
import { generateExcerpt } from "@/lib/tiptap/utils";
import { cn } from "@/lib/utils";

interface NoteListItemProps {
  note: Doc<"notes">;
  isSelected: boolean;
  onClick: () => void;
}

export function NoteListItem({ note, isSelected, onClick }: NoteListItemProps) {
  const excerpt = generateExcerpt(note.content, 100);
  const timeAgo = formatDistanceToNow(new Date(note.updatedAt), {
    addSuffix: true,
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full text-left px-4 py-3.5 transition-colors duration-200 group relative z-0",
          // Selection state: Minimal, distinct background
          isSelected ? "bg-accent/50" : "hover:bg-muted/30 hover:z-10",
        )}
      >
        {/* Selected Indicator - Left Bar */}
        {isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
        )}

        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h3
            className={cn(
              "text-[13px] truncate pr-2",
              isSelected || note.isPinned
                ? "font-semibold text-foreground"
                : "font-medium text-foreground/90",
            )}
          >
            {note.title || "Untitled Note"}
          </h3>
          <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-nums">
            {timeAgo}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              "text-[12px] line-clamp-2 leading-relaxed text-muted-foreground/70",
              isSelected ? "text-muted-foreground/90" : "",
            )}
          >
            {excerpt || "No additional text"}
          </p>
          {note.isPinned && (
            <Pin className="h-3 w-3 text-orange-500/90 fill-current shrink-0 mt-0.5" />
          )}
        </div>

        {/* Tags - Minimal footer if needed, or inline if preferred. keeping it minimal as per "inbox" request */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex gap-1.5 mt-2 overflow-hidden items-center">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center text-[10px] text-muted-foreground/50 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Subtle Divider - Border bottom on container, or separator div */}
      {!isSelected && (
        <div className="absolute bottom-0 left-4 right-0 h-px bg-border/40" />
      )}
    </div>
  );
}

"use client";

import { formatDistanceToNow } from "date-fns";
import { Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Doc } from "@/convex/_generated/dataModel";
import { generateExcerpt } from "@/lib/tiptap/utils";

interface NoteListItemProps {
  note: Doc<"notes">;
  isSelected: boolean;
  onClick: () => void;
}

export function NoteListItem({ note, isSelected, onClick }: NoteListItemProps) {
  const excerpt = generateExcerpt(note.content);
  const timeAgo = formatDistanceToNow(new Date(note.updatedAt), {
    addSuffix: true,
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-4 border-b border-border/60 transition-colors duration-200 ${
        isSelected
          ? "bg-muted border-l-2 border-l-primary"
          : "hover:bg-muted/50 text-foreground"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm line-clamp-1 flex-1">
          {note.title}
        </h3>
        {note.isPinned && (
          <Pin className="h-3.5 w-3.5 text-primary fill-current shrink-0" />
        )}
      </div>

      <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-3">
        {excerpt}
      </p>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{timeAgo}</span>

        {note.tags && note.tags.length > 0 && (
          <div className="flex gap-1">
            {note.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
            {note.tags.length > 2 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                +{note.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

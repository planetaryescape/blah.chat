"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { NoteListItem } from "./NoteListItem";

interface NoteListProps {
  notes: Doc<"notes">[];
  selectedNoteId: Id<"notes"> | null;
  onSelect: (id: Id<"notes">) => void;
}

export function NoteList({ notes, selectedNoteId, onSelect }: NoteListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88, // Reduced estimated height for compact inbox items
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto h-[calc(100vh-240px)]"
      style={{
        contain: "strict",
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const note = notes[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <NoteListItem
                note={note}
                isSelected={selectedNoteId === note._id}
                onClick={() => onSelect(note._id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

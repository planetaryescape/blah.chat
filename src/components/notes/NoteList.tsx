"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "framer-motion";
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
    estimateSize: () => 120, // Estimated height per note item
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
            <motion.div
              key={note._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              layout={false} // Disable layout animations
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

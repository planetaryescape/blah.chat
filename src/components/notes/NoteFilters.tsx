"use client";

import { Button } from "@/components/ui/button";
import { Pin } from "lucide-react";

interface NoteFiltersProps {
  filterPinned: boolean;
  onTogglePinned: () => void;
}

export function NoteFilters({
  filterPinned,
  onTogglePinned,
}: NoteFiltersProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={filterPinned ? "default" : "outline"}
        size="sm"
        onClick={onTogglePinned}
      >
        <Pin className="h-3 w-3 mr-1" />
        Pinned Only
      </Button>
    </div>
  );
}

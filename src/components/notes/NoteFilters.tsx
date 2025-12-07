"use client";

import { Button } from "@/components/ui/button";
import { Pin } from "lucide-react";
import { TagFilter } from "./TagFilter";

interface NoteFiltersProps {
  filterPinned: boolean;
  onTogglePinned: () => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tagFilterMode: "AND" | "OR";
  onTagFilterModeChange: (mode: "AND" | "OR") => void;
}

export function NoteFilters({
  filterPinned,
  onTogglePinned,
  selectedTags,
  onTagsChange,
  tagFilterMode,
  onTagFilterModeChange,
}: NoteFiltersProps) {
  return (
    <div className="space-y-3">
      <Button
        variant={filterPinned ? "default" : "outline"}
        size="sm"
        onClick={onTogglePinned}
        className="w-full"
      >
        <Pin className="h-3 w-3 mr-1" />
        Pinned Only
      </Button>
      <TagFilter
        selectedTags={selectedTags}
        onTagsChange={onTagsChange}
        tagFilterMode={tagFilterMode}
        onTagFilterModeChange={onTagFilterModeChange}
      />
    </div>
  );
}

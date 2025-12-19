"use client";

import { Plus, Search, Settings2 } from "lucide-react";
import { ProjectFilterSelect } from "@/components/projects/ProjectFilterSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { NoteFilters } from "./NoteFilters";
import { NoteList } from "./NoteList";
import { NoteListSkeleton } from "./NoteListSkeleton";
import { TagManagement } from "./TagManagement";

interface NoteSidebarProps {
  notes: Doc<"notes">[] | undefined;
  selectedNoteId: Id<"notes"> | null;
  onSelectNote: (id: Id<"notes">) => void;
  onCreateNote: () => void;
  searchParam: string;
  onSearchChange: (value: string) => void;
  filterPinned: boolean;
  onTogglePinned: () => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tagFilterMode: "AND" | "OR";
  onTagFilterModeChange: (mode: "AND" | "OR") => void;
  projectId: Id<"projects"> | null;
  onProjectIdChange: (id: Id<"projects"> | null) => void;
  className?: string;
  showFilters?: boolean;
  onToggleFilters?: () => void;
}

export function NoteSidebar({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  searchParam,
  onSearchChange,
  filterPinned,
  onTogglePinned,
  selectedTags,
  onTagsChange,
  tagFilterMode,
  onTagFilterModeChange,
  projectId,
  onProjectIdChange,
  className,
  showFilters = false,
  onToggleFilters,
}: NoteSidebarProps) {
  return (
    <div
      className={cn(
        "flex flex-col h-full bg-muted/5 border-r border-border/40",
        className
      )}
    >
      {/* Header Section */}
      <div className="flex-none p-4 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground/90">
            Notes
          </h2>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={onToggleFilters}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Filters & Options</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={onCreateNote}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Note</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Search Bar - Bespoke Spotlight Style */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-foreground transition-colors" />
          <Input
            value={searchParam}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes..."
            className="pl-9 h-9 bg-background/50 border-transparent hover:bg-background/80 hover:border-border/40 focus:bg-background focus:border-primary/20 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm rounded-lg text-sm"
          />
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="space-y-3 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
            <ProjectFilterSelect
              value={projectId}
              onChange={onProjectIdChange}
              className="w-full"
            />
            <NoteFilters
              filterPinned={filterPinned}
              onTogglePinned={onTogglePinned}
              selectedTags={selectedTags}
              onTagsChange={onTagsChange}
              tagFilterMode={tagFilterMode}
              onTagFilterModeChange={onTagFilterModeChange}
            />
            <TagManagement />
          </div>
        )}
      </div>

      <Separator className="bg-border/40" />

      {/* Note List */}
      <div className="flex-1 overflow-hidden relative">
        {notes === undefined ? (
          <NoteListSkeleton />
        ) : notes.length === 0 ? (
          searchParam || filterPinned || selectedTags.length > 0 ? (
            <div className="p-8">
              <EmptyState variant="no-results" />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-muted/5">
              <EmptyState variant="no-notes" onCreateNote={onCreateNote} />
            </div>
          )
        ) : (
          <NoteList
            notes={notes}
            selectedNoteId={selectedNoteId}
            onSelect={onSelectNote}
          />
        )}
      </div>

      {/* Footer / Status Bar */}
      <div className="flex-none p-2 bg-muted/10 border-t border-border/40 text-[10px] text-muted-foreground text-center font-medium uppercase tracking-wider">
        {notes ? (
          <>
            {notes.length} {notes.length === 1 ? "Note" : "Notes"}
          </>
        ) : (
          <Skeleton className="h-3 w-12 inline-block" />
        )}
      </div>
    </div>
  );
}

"use client";

import { useQuery } from "convex/react";
import { ChevronDown, Hash, List, Network, X } from "lucide-react";
import { useState } from "react";
import { TagTree } from "@/components/notes/TagTree";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { buildTagTree, getTagLabel } from "@/lib/utils/tagUtils";

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tagFilterMode: "AND" | "OR";
  onTagFilterModeChange: (mode: "AND" | "OR") => void;
}

export function TagFilter({
  selectedTags,
  onTagsChange,
  tagFilterMode,
  onTagFilterModeChange,
}: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"flat" | "tree">("tree");
  const tagStats =
    useQuery(api.notes.getTagStats) ||
    ([] as Array<{ tag: string; count: number }>);

  const tagTree = buildTagTree(tagStats);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearAllTags = () => {
    onTagsChange([]);
  };

  return (
    <div className="space-y-3">
      {/* Tag Cloud Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Hash className="h-3 w-3" />
              <span className="text-xs">
                {tagStats.length === 0
                  ? "No tags"
                  : selectedTags.length === 0
                    ? `All tags (${tagStats.length})`
                    : `${selectedTags.length} selected`}
              </span>
            </div>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-2">
              <CommandInput
                placeholder="Search tags..."
                className="h-9 border-0 focus:ring-0"
              />
              <div className="flex gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("tree")}
                  className={cn(
                    "h-7 w-7 p-0",
                    viewMode === "tree" && "bg-muted",
                  )}
                  title="Tree view"
                >
                  <Network className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("flat")}
                  className={cn(
                    "h-7 w-7 p-0",
                    viewMode === "flat" && "bg-muted",
                  )}
                  title="Flat view"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                <ScrollArea className="h-[200px]">
                  {viewMode === "tree" ? (
                    <div className="p-1">
                      <TagTree
                        tree={tagTree}
                        selectedTags={selectedTags}
                        onToggleTag={toggleTag}
                      />
                    </div>
                  ) : (
                    <>
                      {tagStats.map(
                        ({ tag, count }: { tag: string; count: number }) => (
                          <CommandItem
                            key={tag}
                            onSelect={() => toggleTag(tag)}
                            className="cursor-pointer"
                          >
                            <div
                              className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                                selectedTags.includes(tag)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "opacity-50 [&_svg]:invisible",
                              )}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3 w-3"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                            <span className="flex-1 text-sm">{tag}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {count}
                            </span>
                          </CommandItem>
                        ),
                      )}
                    </>
                  )}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Active Filters */}
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Active filters:
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllTags}
              className="h-auto py-1 px-2 text-xs"
            >
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs px-2 py-0.5 cursor-pointer hover:bg-secondary/80"
                onClick={() => toggleTag(tag)}
                title={tag}
              >
                {getTagLabel(tag)}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Match:</span>
            <div className="flex gap-1">
              <Button
                variant={tagFilterMode === "AND" ? "default" : "outline"}
                size="sm"
                onClick={() => onTagFilterModeChange("AND")}
                className="h-6 px-2 text-xs"
              >
                All
              </Button>
              <Button
                variant={tagFilterMode === "OR" ? "default" : "outline"}
                size="sm"
                onClick={() => onTagFilterModeChange("OR")}
                className="h-6 px-2 text-xs"
              >
                Any
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

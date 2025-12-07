"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getTagLabel, normalizeTag, validateTag } from "@/lib/utils/tagUtils";
import { useMutation } from "convex/react";
import { Plus, Tag, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface MinimalTagInputProps {
  noteId: Id<"notes">;
  tags: string[];
  suggestedTags: string[];
}

export function MinimalTagInput({
  noteId,
  tags,
  suggestedTags,
}: MinimalTagInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // @ts-ignore - Convex type instantiation depth issue
  const addTag = useMutation(api.notes.addTag);
  // @ts-ignore - Convex type instantiation depth issue
  const removeTag = useMutation(api.notes.removeTag);

  const handleAddTag = async (tag: string) => {
    try {
      // Normalize and validate
      const normalized = normalizeTag(tag);
      const validation = validateTag(normalized);

      if (!validation.valid) {
        toast.error(validation.error || "Invalid tag");
        return;
      }

      if (tags.includes(normalized)) {
        toast.info("Tag already added");
        return;
      }

      await addTag({ noteId, tag: normalized });
      toast.success("Tag added");
      setInputValue("");
      setOpen(false);
    } catch (error) {
      console.error("Failed to add tag:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add tag");
    }
  };

  const handleRemoveTag = async (tag: string) => {
    try {
      await removeTag({ noteId, tag });
      toast.success("Tag removed");
    } catch (error) {
      console.error("Failed to remove tag:", error);
      toast.error("Failed to remove tag");
    }
  };

  const handleCreateTag = () => {
    if (inputValue.trim()) {
      handleAddTag(inputValue);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Active Tags */}
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="h-6 px-2 text-xs font-normal bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-default group"
          title={tag} // Show full path on hover
        >
          {getTagLabel(tag)}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveTag(tag);
            }}
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove {tag} tag</span>
          </button>
        </Badge>
      ))}

      {/* Popover Trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[200px]" align="start">
          <Command>
            <CommandInput
              placeholder="Search or create tag..."
              value={inputValue}
              onValueChange={setInputValue}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2 text-xs text-muted-foreground">
                  {inputValue ? (
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      onClick={handleCreateTag}
                    >
                      <Plus className="h-3 w-3" />
                      Create "{inputValue}"
                    </button>
                  ) : (
                    "No tags found."
                  )}
                </div>
              </CommandEmpty>

              {suggestedTags.length > 0 && (
                <CommandGroup heading="Suggestions">
                  {suggestedTags
                    .filter((t) => !tags.includes(t))
                    .map((tag) => (
                      <CommandItem
                        key={tag}
                        onSelect={() => handleAddTag(tag)}
                        className="text-xs"
                      >
                        <Tag className="mr-2 h-3 w-3" />
                        {tag}
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              {inputValue &&
                !suggestedTags.includes(inputValue) &&
                !tags.includes(inputValue) && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Create">
                      <CommandItem
                        onSelect={handleCreateTag}
                        className="text-xs"
                      >
                        <Plus className="mr-2 h-3 w-3" />
                        Create "{inputValue}"
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

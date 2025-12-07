"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface TagInputProps {
  noteId: Id<"notes">;
  tags: string[];
  suggestedTags: string[];
}

export function TagInput({ noteId, tags, suggestedTags }: TagInputProps) {
  const [newTag, setNewTag] = useState("");

  // @ts-ignore - Convex type instantiation depth issue
  const acceptTag = useMutation(api.notes.acceptTag);
  // @ts-ignore - Convex type instantiation depth issue
  const addTag = useMutation(api.notes.addTag);
  // @ts-ignore - Convex type instantiation depth issue
  const removeTag = useMutation(api.notes.removeTag);

  const handleAcceptTag = async (tag: string) => {
    try {
      await acceptTag({ noteId, tag });
    } catch (error) {
      console.error("Failed to accept tag:", error);
      toast.error("Failed to add tag");
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    try {
      await addTag({ noteId, tag: newTag.trim() });
      setNewTag("");
      toast.success("Tag added");
    } catch (error) {
      console.error("Failed to add tag:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add tag",
      );
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-3">
      {/* Active Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="default"
              className="cursor-pointer hover:bg-primary/80 transition-colors"
              onClick={() => handleRemoveTag(tag)}
            >
              {tag}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Suggested Tags */}
      {suggestedTags.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">
            AI suggestions:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleAcceptTag(tag)}
              >
                <Plus className="mr-1 h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add Tag Input */}
      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a tag..."
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          onClick={handleAddTag}
          disabled={!newTag.trim()}
          className="h-8"
        >
          Add
        </Button>
      </div>
    </div>
  );
}

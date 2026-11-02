"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, GitMerge, Pencil, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getTagLabel } from "@/lib/utils/tagUtils";

export function TagManagement() {
  const [open, setOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");

  const [selectedMergeTags, setSelectedMergeTags] = useState<string[]>([]);
  const [mergeTargetTag, setMergeTargetTag] = useState("");

  // Phase 5: Use centralized tag system
  // @ts-ignore - Type depth exceeded with complex Convex query
  const tagStats = useQuery(api.tags.queries.getTagStats) || [];
  // @ts-ignore - Type depth exceeded with complex Convex query
  const cooccurrence = useQuery(api.tags.queries.getTagCooccurrence) || [];

  const renameTag = useMutation(api.notes.renameTag);
  const mergeTags = useMutation(api.notes.mergeTags);

  const handleRename = async () => {
    if (!selectedTag || !newTagName.trim()) {
      toast.error("Please enter a new tag name");
      return;
    }

    try {
      const result = await renameTag({
        oldTag: selectedTag,
        newTag: newTagName.trim().toLowerCase(),
      });
      toast.success(`Renamed tag in ${result.updated} notes`);
      setRenameDialogOpen(false);
      setSelectedTag(null);
      setNewTagName("");
    } catch (error) {
      console.error("Failed to rename tag:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to rename tag",
      );
    }
  };

  const handleMerge = async () => {
    if (selectedMergeTags.length === 0 || !mergeTargetTag.trim()) {
      toast.error("Select tags to merge and enter a target tag");
      return;
    }

    try {
      const result = await mergeTags({
        sourceTags: selectedMergeTags,
        targetTag: mergeTargetTag.trim().toLowerCase(),
      });
      toast.success(`Merged tags in ${result.updated} notes`);
      setMergeDialogOpen(false);
      setSelectedMergeTags([]);
      setMergeTargetTag("");
    } catch (error) {
      console.error("Failed to merge tags:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to merge tags",
      );
    }
  };

  const toggleMergeTag = (tag: string) => {
    setSelectedMergeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const getRelatedTags = (tag: string) => {
    const tagData = cooccurrence.find((item: any) => item.tag === tag);
    return tagData?.relatedTags || [];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
          <Settings2 className="h-3.5 w-3.5" />
          Manage Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Tag Management</DialogTitle>
          <DialogDescription>
            Rename, merge, or analyze your tags
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRenameDialogOpen(true)}
              className="gap-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename Tag
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMergeDialogOpen(true)}
              className="gap-2"
            >
              <GitMerge className="h-3.5 w-3.5" />
              Merge Tags
            </Button>
          </div>

          <Separator />

          {/* Tag List */}
          <div>
            <h3 className="text-sm font-semibold mb-2">
              All Tags ({tagStats.length})
            </h3>
            <ScrollArea className="h-[300px] border rounded-md p-3">
              <div className="space-y-2">
                {tagStats.map((stat: any) => {
                  const related = getRelatedTags(stat.tag);
                  return (
                    <div
                      key={stat.tag}
                      className="p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" title={stat.tag}>
                            {getTagLabel(stat.tag)}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {stat.count} {stat.count === 1 ? "note" : "notes"}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTag(stat.tag);
                              setNewTagName(stat.tag);
                              setRenameDialogOpen(true);
                            }}
                            className="h-6 w-6 p-0"
                            title="Rename"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {related.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Often with:{" "}
                          {related.slice(0, 3).map((r: any, i: number) => (
                            <span key={r.tag}>
                              {i > 0 && ", "}
                              {getTagLabel(r.tag)} ({r.count})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Tag</DialogTitle>
            <DialogDescription>
              This will update the tag across all notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Tag</Label>
              <Input value={selectedTag || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>New Tag Name</Label>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Enter new tag name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRename();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Tags</DialogTitle>
            <DialogDescription>
              Combine multiple tags into one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Tags to Merge</Label>
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <div className="space-y-1">
                  {tagStats.map((stat: any) => (
                    <div
                      key={stat.tag}
                      className="flex items-center gap-2 p-1 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleMergeTag(stat.tag)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMergeTags.includes(stat.tag)}
                        onChange={() => toggleMergeTag(stat.tag)}
                        className="h-4 w-4"
                      />
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        title={stat.tag}
                      >
                        {getTagLabel(stat.tag)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({stat.count})
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {selectedMergeTags.length > 0 && (
              <>
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Target Tag Name</Label>
                  <Input
                    value={mergeTargetTag}
                    onChange={(e) => setMergeTargetTag(e.target.value)}
                    placeholder="Enter target tag name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleMerge();
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedMergeTags.length} tags will be merged
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMerge}
              disabled={
                selectedMergeTags.length === 0 || !mergeTargetTag.trim()
              }
            >
              Merge Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

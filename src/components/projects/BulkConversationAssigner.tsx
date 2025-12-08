"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface BulkConversationAssignerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: Id<"projects">;
  projectName: string;
}

export function BulkConversationAssigner({
  open,
  onOpenChange,
  projectId,
  projectName,
}: BulkConversationAssignerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "current" | "unassigned">("all");
  const [selectedIds, setSelectedIds] = useState<Set<Id<"conversations">>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Doc<"conversations">[]>(
    [],
  );

  // @ts-ignore - Type instantiation depth issue
  const conversations = useQuery(api.conversations.list, {});
  const assignConversations = useMutation(api.projects.assignConversations);
  const hybridSearchAction = useAction(
    api.conversations.hybridSearch.hybridSearch,
  );
  const user = useQuery(api.users.getCurrentUser, {});

  // Hybrid search with debounce
  const handleSearch = useDebouncedCallback(async (query: string) => {
    if (!query.trim() || !user) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await hybridSearchAction({
        query,
        limit: 100,
        includeArchived: false,
        projectId:
          filter === "current"
            ? projectId
            : filter === "unassigned"
              ? "none"
              : undefined,
      });
      setSearchResults(results);
    } catch (error) {
      console.error("Hybrid search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, 350);

  // Display logic: use search results if searching, otherwise filter by project
  const displayedConversations: Doc<"conversations">[] | undefined =
    searchQuery.trim()
      ? searchResults
      : conversations?.filter((conv: Doc<"conversations">) => {
          if (filter === "current" && conv.projectId !== projectId)
            return false;
          if (filter === "unassigned" && conv.projectId !== undefined)
            return false;
          return true;
        });

  // Focus search input when modal opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        const input = document.querySelector(
          "[cmdk-input]",
        ) as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const toggleSelection = (id: Id<"conversations">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (displayedConversations) {
      setSelectedIds(new Set(displayedConversations.map((c) => c._id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleAssign = async () => {
    if (selectedIds.size === 0) {
      toast.error("No conversations selected");
      return;
    }

    setIsSubmitting(true);
    try {
      await assignConversations({
        projectId,
        conversationIds: Array.from(selectedIds),
      });
      toast.success(
        `Assigned ${selectedIds.size} conversation${selectedIds.size === 1 ? "" : "s"} to ${projectName}`,
      );
      setSelectedIds(new Set());
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to assign conversations");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    if (selectedIds.size === 0) {
      toast.error("No conversations selected");
      return;
    }

    setIsSubmitting(true);
    try {
      await assignConversations({
        projectId: null,
        conversationIds: Array.from(selectedIds),
      });
      toast.success(
        `Unassigned ${selectedIds.size} conversation${selectedIds.size === 1 ? "" : "s"}`,
      );
      setSelectedIds(new Set());
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to unassign conversations");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Manage Conversations</DialogTitle>
          <DialogDescription>
            Assign conversations to {projectName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {/* Filters */}
          <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="current">Current Project</TabsTrigger>
              <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Selection controls */}
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={selectAll}
              disabled={!displayedConversations?.length}
            >
              Select All ({displayedConversations?.length ?? 0})
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
          </div>

          {/* Command list */}
          <Command className="flex-1 border rounded-md">
            <CommandInput
              placeholder="Search conversations..."
              value={searchQuery}
              onValueChange={(value) => {
                setSearchQuery(value);
                handleSearch(value);
              }}
            />
            <CommandList>
              <CommandEmpty>
                {isSearching ? "Searching..." : "No conversations found"}
              </CommandEmpty>
              <CommandGroup>
                {displayedConversations?.map(
                  (conv: {
                    _id: string;
                    title: string;
                    projectId?: string;
                  }) => (
                    <CommandItem
                      key={conv._id}
                      onSelect={() => toggleSelection(conv._id as any)}
                      className="flex items-center gap-2 py-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedIds.has(conv._id as any)}
                        onCheckedChange={() => toggleSelection(conv._id as any)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4"
                      />
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <p className="text-sm truncate">{conv.title}</p>
                        {conv.projectId === projectId ? (
                          <Badge
                            variant="secondary"
                            className="text-xs flex-shrink-0"
                          >
                            Current
                          </Badge>
                        ) : conv.projectId ? (
                          <Badge
                            variant="outline"
                            className="text-xs flex-shrink-0"
                          >
                            Other
                          </Badge>
                        ) : null}
                      </div>
                    </CommandItem>
                  ),
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleUnassign}
            disabled={selectedIds.size === 0 || isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Remove from Project
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedIds.size === 0 || isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Assign to Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

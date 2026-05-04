"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAssignConversations } from "@/lib/hooks/mutations/useProjectMutations";
import { useConversations } from "@/lib/hooks/queries/useConversations";

interface BulkConversationAssignerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: conversationsData } = useConversations({ pageSize: 500 });
  const conversations = conversationsData?.items;
  const assignConversations = useAssignConversations();

  // Filter and search conversations client-side
  const displayedConversations = conversations?.filter(
    (conv: { _id: string; title?: string | null; projectId?: string }) => {
      // Filter by project assignment
      if (filter === "current" && (conv as any).projectId !== projectId)
        return false;
      if (filter === "unassigned" && (conv as any).projectId !== undefined)
        return false;

      // Filter by search query
      if (searchQuery.trim()) {
        return (conv.title ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      }
      return true;
    },
  );

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

  const toggleSelection = (id: string) => {
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

  const { run: handleAssign, isPending: isAssigning } = useAsyncAction(
    async () => {
      if (selectedIds.size === 0) {
        toast.error("No conversations selected");
        return;
      }
      await assignConversations.mutateAsync({
        projectId,
        conversationIds: Array.from(selectedIds),
      });
      toast.success(
        `Assigned ${selectedIds.size} conversation${selectedIds.size === 1 ? "" : "s"} to ${projectName}`,
      );
      setSelectedIds(new Set());
      onOpenChange(false);
    },
    {
      onError: (error) => {
        toast.error("Failed to assign conversations");
        console.error(error);
      },
    },
  );

  const { run: handleUnassign, isPending: isUnassigning } = useAsyncAction(
    async () => {
      if (selectedIds.size === 0) {
        toast.error("No conversations selected");
        return;
      }
      await assignConversations.mutateAsync({
        projectId,
        targetProjectId: null,
        conversationIds: Array.from(selectedIds),
      });
      toast.success(
        `Unassigned ${selectedIds.size} conversation${selectedIds.size === 1 ? "" : "s"}`,
      );
      setSelectedIds(new Set());
      onOpenChange(false);
    },
    {
      onError: (error) => {
        toast.error("Failed to unassign conversations");
        console.error(error);
      },
    },
  );

  const isSubmitting = isAssigning || isUnassigning;

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
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No conversations found</CommandEmpty>
              <CommandGroup>
                {displayedConversations?.map(
                  (conv: {
                    _id: string;
                    title?: string | null;
                    projectId?: string;
                  }) => (
                    <CommandItem
                      key={conv._id}
                      onSelect={() => toggleSelection(conv._id)}
                      className="flex items-center gap-2 py-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedIds.has(conv._id)}
                        onCheckedChange={() => toggleSelection(conv._id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4"
                      />
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <p className="text-sm truncate">
                          {conv.title ?? "Untitled"}
                        </p>
                        {(conv as any).projectId === projectId ? (
                          <Badge
                            variant="secondary"
                            className="text-xs flex-shrink-0"
                          >
                            Current
                          </Badge>
                        ) : (conv as any).projectId ? (
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

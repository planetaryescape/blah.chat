"use client";

import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { Loader2, MoreVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AddMemoryDialog } from "@/components/memories/AddMemoryDialog";
import { DeleteAllMemoriesDialog } from "@/components/memories/DeleteAllMemoriesDialog";
import { MemorySettingsItem } from "@/components/memories/MemorySettingsItem";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";

export function MemorySettings() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);
  const {
    results: memories,
    status,
    loadMore,
  } = usePaginatedQuery(api.memories.list, {}, { initialNumItems: 10 });
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const createMemory = useMutation(api.memories.createManual);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateMemory = useMutation(api.memories.update);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const deleteMemory = useMutation(api.memories.deleteMemory);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const scanRecentConversations = useMutation(
    api.memories.scanRecentConversations,
  );
  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const consolidateMemories = useAction(api.memories.consolidateUserMemories);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const deleteAllMemories = useMutation(api.memories.deleteAllMemories);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleAddMemory = async (content: string) => {
    try {
      await createMemory({ content });
      toast.success("Memory added!");
    } catch (_error) {
      toast.error("Failed to add memory");
      throw _error;
    }
  };

  const handleUpdateMemory = async (id: string, content: string) => {
    try {
      await updateMemory({ id: id as any, content });
      toast.success("Memory updated!");
    } catch (_error) {
      toast.error("Failed to update memory");
      throw _error;
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await deleteMemory({ id: id as any });
      toast.success("Memory deleted!");
    } catch (_error) {
      toast.error("Failed to delete memory");
    }
  };

  const handleScanRecent = async () => {
    try {
      const result = await scanRecentConversations();
      if (result.triggered > 0) {
        toast.success(`Scanning ${result.triggered} recent conversations...`);
      } else {
        toast.info("No recent conversations found to scan.");
      }
    } catch (_error) {
      toast.error("Failed to scan conversations");
    }
  };

  const handleConsolidate = async () => {
    setIsConsolidating(true);
    try {
      toast.info("Consolidating memories...");
      const result = await consolidateMemories();
      if (result.created > 0 || result.deleted > 0) {
        toast.success(
          `Consolidated ${result.original} → ${result.consolidated} memories`,
        );
      } else {
        toast.info("No duplicate memories found.");
      }
    } catch (error) {
      toast.error("Failed to consolidate memories");
      console.error("Consolidation error:", error);
    } finally {
      setIsConsolidating(false);
    }
  };

  const handleDeleteAll = async () => {
    const result = await deleteAllMemories();
    toast.success(`Deleted ${result.deleted} memories`);
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Memory Settings</CardTitle>
          <CardDescription>
            Control how AI extracts and remembers facts from conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Memory Actions</Label>
              <p className="text-sm text-muted-foreground">
                Scan, consolidate, migrate, or delete all memories
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleScanRecent}>
                  Scan Recent Chats
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleConsolidate}
                  disabled={isConsolidating}
                >
                  {isConsolidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Consolidating...
                    </>
                  ) : (
                    "Consolidate Memories"
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  Delete All Memories
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm">
              <strong>How it works:</strong> AI analyzes your conversations and
              extracts memorable facts like preferences, project details, and
              context. These memories help AI provide more personalized
              responses.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Memories</CardTitle>
            <CardDescription>
              View and manage what the AI remembers about you
            </CardDescription>
          </div>
          <AddMemoryDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onAdd={handleAddMemory}
          />
        </CardHeader>
        <CardContent>
          {!memories ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No memories found. Start chatting or add one manually!
            </div>
          ) : (
            <div className="space-y-4">
              {memories.map((memory: any) => (
                <MemorySettingsItem
                  key={memory._id}
                  memory={memory}
                  onUpdate={handleUpdateMemory}
                  onDelete={handleDeleteMemory}
                />
              ))}
              {(status === "CanLoadMore" || status === "LoadingMore") && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => loadMore(10)}
                    disabled={status === "LoadingMore"}
                  >
                    {status === "LoadingMore" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteAllMemoriesDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        memoriesCount={memories?.length || 0}
        onConfirm={handleDeleteAll}
      />
    </div>
  );
}

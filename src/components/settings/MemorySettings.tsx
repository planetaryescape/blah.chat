"use client";

import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { Loader2, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";

export function MemorySettings() {
  const user = useQuery(api.users.getCurrentUser);
  const _updatePreferences = useMutation(api.users.updatePreferences);
  const {
    results: memories,
    status,
    loadMore,
  } = usePaginatedQuery(api.memories.list, {}, { initialNumItems: 10 });
  const createMemory = useMutation(api.memories.createManual);
  const updateMemory = useMutation(api.memories.update);
  const deleteMemory = useMutation(api.memories.deleteMemory);
  const scanRecentConversations = useMutation(
    api.memories.scanRecentConversations,
  );
  const migrateMemories = useAction(api.memories.migrateUserMemories);
  const consolidateMemories = useAction(api.memories.consolidateUserMemories);
  const deleteAllMemories = useMutation(api.memories.deleteAllMemories);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [editingMemory, setEditingMemory] = useState<any>(null);
  const [editMemoryContent, setEditMemoryContent] = useState("");
  const [_isMigrating, setIsMigrating] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleAddMemory = async () => {
    if (!newMemoryContent.trim()) return;
    try {
      await createMemory({ content: newMemoryContent });
      toast.success("Memory added!");
      setNewMemoryContent("");
      setIsAddDialogOpen(false);
    } catch (_error) {
      toast.error("Failed to add memory");
    }
  };

  const handleUpdateMemory = async () => {
    if (!editingMemory || !editMemoryContent.trim()) return;
    try {
      await updateMemory({ id: editingMemory._id, content: editMemoryContent });
      toast.success("Memory updated!");
      setEditingMemory(null);
      setEditMemoryContent("");
    } catch (_error) {
      toast.error("Failed to update memory");
    }
  };

  const handleDeleteMemory = async (id: any) => {
    try {
      await deleteMemory({ id });
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

  const _handleMigrateMemories = async () => {
    setIsMigrating(true);
    try {
      toast.info("Migrating memories to third-person format...");
      const result = await migrateMemories();
      if (result.migrated > 0) {
        toast.success(
          `Successfully migrated ${result.migrated} memories! ${result.skipped > 0 ? `(${result.skipped} skipped)` : ""}`,
        );
      } else {
        toast.info("No memories to migrate.");
      }
    } catch (error) {
      toast.error("Failed to migrate memories");
      console.error("Migration error:", error);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleConsolidate = async () => {
    setIsConsolidating(true);
    try {
      toast.info("Consolidating memories...");
      const result = await consolidateMemories();
      if (result.created > 0 || result.deleted > 0) {
        toast.success(
          `Consolidated ${result.original} → ${result.consolidated} memories (${result.created} new, ${result.deleted} removed)`,
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
    if (deleteConfirmText !== "DELETE") return;

    try {
      const result = await deleteAllMemories();
      toast.success(`Deleted ${result.deleted} memories`);
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
    } catch (error) {
      toast.error("Failed to delete memories");
      console.error("Delete error:", error);
    }
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
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Memory
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Memory</DialogTitle>
                <DialogDescription>
                  Manually add a fact for the AI to remember.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Textarea
                  placeholder="e.g. I prefer Python over JavaScript..."
                  value={newMemoryContent}
                  onChange={(e) => setNewMemoryContent(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddMemory}>Add Memory</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                <div
                  key={memory._id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{memory.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(memory.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog
                      open={editingMemory?._id === memory._id}
                      onOpenChange={(open) => {
                        if (open) {
                          setEditingMemory(memory);
                          setEditMemoryContent(memory.content);
                        } else {
                          setEditingMemory(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Memory</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          <Textarea
                            value={editMemoryContent}
                            onChange={(e) =>
                              setEditMemoryContent(e.target.value)
                            }
                            className="min-h-[100px]"
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setEditingMemory(null)}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleUpdateMemory}>
                            Save Changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Memory?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. The AI will forget
                            this fact.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteMemory(memory._id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
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

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Memories?</DialogTitle>
            <DialogDescription>
              This will permanently delete all {memories?.length || 0} memories.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <code className="font-mono font-bold">DELETE</code> to
                confirm
              </Label>
              <Input
                id="confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={deleteConfirmText !== "DELETE"}
            >
              Delete All Memories
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

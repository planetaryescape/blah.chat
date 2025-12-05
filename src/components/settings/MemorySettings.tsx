"use client";

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
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function MemorySettings() {
  const user = useQuery(api.users.getCurrentUser);
  const updatePreferences = useMutation(api.users.updatePreferences);
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

  const [autoExtractEnabled, setAutoExtractEnabled] = useState(true);
  const [extractInterval, setExtractInterval] = useState(5);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [editingMemory, setEditingMemory] = useState<any>(null);
  const [editMemoryContent, setEditMemoryContent] = useState("");

  useEffect(() => {
    if (user?.preferences) {
      setAutoExtractEnabled(user.preferences.autoMemoryExtractEnabled ?? true);
      setExtractInterval(user.preferences.autoMemoryExtractInterval ?? 5);
    }
  }, [user]);

  const handleToggleChange = async (checked: boolean) => {
    setAutoExtractEnabled(checked);
    try {
      await updatePreferences({
        preferences: {
          autoMemoryExtractEnabled: checked,
          autoMemoryExtractInterval: extractInterval,
        },
      });
      toast.success("Memory settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
      setAutoExtractEnabled(!checked);
    }
  };

  const handleSliderChange = async (value: number[]) => {
    const newInterval = value[0];
    setExtractInterval(newInterval);
    try {
      await updatePreferences({
        preferences: {
          autoMemoryExtractEnabled: autoExtractEnabled,
          autoMemoryExtractInterval: newInterval,
        },
      });
      toast.success("Memory settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
      setExtractInterval(extractInterval);
    }
  };

  const handleAddMemory = async () => {
    if (!newMemoryContent.trim()) return;
    try {
      await createMemory({ content: newMemoryContent });
      toast.success("Memory added!");
      setNewMemoryContent("");
      setIsAddDialogOpen(false);
    } catch (error) {
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
    } catch (error) {
      toast.error("Failed to update memory");
    }
  };

  const handleDeleteMemory = async (id: any) => {
    try {
      await deleteMemory({ id });
      toast.success("Memory deleted!");
    } catch (error) {
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
    } catch (error) {
      toast.error("Failed to scan conversations");
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
              <Label htmlFor="auto-extract">Auto-extract memories</Label>
              <p className="text-sm text-muted-foreground">
                Automatically extract facts from conversations
              </p>
            </div>
            <Switch
              id="auto-extract"
              checked={autoExtractEnabled}
              onCheckedChange={handleToggleChange}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Extraction interval</Label>
              <p className="text-sm text-muted-foreground">
                Extract memories every {extractInterval} messages
              </p>
            </div>
            <Slider
              value={[extractInterval]}
              onValueChange={(value) => setExtractInterval(value[0])}
              onValueCommit={handleSliderChange}
              min={3}
              max={20}
              step={1}
              disabled={!autoExtractEnabled}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3 messages</span>
              <span>20 messages</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="space-y-0.5">
              <Label>Scan Recent Chats</Label>
              <p className="text-sm text-muted-foreground">
                Force AI to look for memories in recent conversations
              </p>
            </div>
            <Button variant="outline" onClick={handleScanRecent}>
              Scan Now
            </Button>
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
    </div>
  );
}

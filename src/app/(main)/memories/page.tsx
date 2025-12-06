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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  Brain,
  Calendar,
  Eye,
  EyeOff,
  Loader2,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ScrollArea } from "@/components/ui/scroll-area";

export default function MemoriesPage() {
  // @ts-ignore - Convex type instantiation depth issue
  const memories = useQuery(api.memories.listAll);
  const deleteMemory = useMutation(api.memories.deleteMemory);
  const deleteAllMemories = useMutation(api.memories.deleteAllMemories);
  const consolidateMemories = useAction(api.memories.consolidateUserMemories);
  const [showReasoning, setShowReasoning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Load toggle state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("showMemoryReasoning");
    if (stored) {
      setShowReasoning(JSON.parse(stored));
    }
  }, []);

  // Save toggle state to localStorage
  const toggleReasoning = () => {
    const newValue = !showReasoning;
    setShowReasoning(newValue);
    localStorage.setItem("showMemoryReasoning", JSON.stringify(newValue));
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory({ id: id as any });
      toast.success("Memory deleted");
    } catch (error) {
      toast.error("Failed to delete memory");
    }
  };

  const handleDeleteAll = async () => {
    if (deleteConfirmText !== "DELETE") return;

    setIsDeleting(true);
    try {
      const result = await deleteAllMemories({});
      toast.success(`Deleted ${result.deleted} memories`);
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
    } catch (error) {
      toast.error("Failed to delete memories");
    } finally {
      setIsDeleting(false);
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

  // Helper: Get importance badge color
  const getImportanceBadge = (importance: number) => {
    if (importance >= 9) {
      return "bg-orange-500/20 text-orange-700 dark:text-orange-300";
    }
    if (importance >= 7) {
      return "bg-blue-500/20 text-blue-700 dark:text-blue-300";
    }
    return "bg-gray-500/20 text-gray-700 dark:text-gray-300";
  };

  if (memories === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const groupedMemories = memories.reduce<Record<string, typeof memories>>(
    (acc: Record<string, typeof memories>, memory: any) => {
      const category = (memory.metadata?.category as string) || "other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(memory);
      return acc;
    },
    {},
  );

  const categoryLabels: Record<string, { title: string; description: string }> =
    {
      identity: {
        title: "Identity",
        description: "Personal info, background, occupation",
      },
      preference: {
        title: "Preferences",
        description: "Likes, dislikes, style choices",
      },
      project: {
        title: "Projects",
        description: "Things you're building, tech stack",
      },
      context: {
        title: "Context",
        description: "Goals, challenges, environment",
      },
      relationship: {
        title: "Relationships",
        description: "Team members, collaborators",
      },
    };

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 bg-gradient-radial from-violet-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/60 backdrop-blur-xl border-b border-border/40 shadow-sm transition-all duration-200">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Memories
              </h1>
              <p className="text-muted-foreground">
                AI-extracted facts from your conversations. Only high-quality
                memories (importance 7+) are saved.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleReasoning}
                className="gap-2"
              >
                {showReasoning ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hide reasoning
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Show reasoning
                  </>
                )}
              </Button>
              {memories && memories.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
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
              )}
            </div>
          </div>
        </div>
        {/* Gradient Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-500/5 pointer-events-none" />
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          {memories.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-8">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No memories yet
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    As you chat, AI will automatically extract memorable facts.
                    You can also manually trigger extraction using the "Extract
                    Memories" button in any conversation.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMemories).map(
                ([category, categoryMemories]: [string, any]) => {
                  const label = categoryLabels[category] || {
                    title: category,
                    description: "Other memories",
                  };

                  return (
                    <Card key={category}>
                      <CardHeader>
                        <CardTitle>{label.title}</CardTitle>
                        <CardDescription>{label.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {(categoryMemories || []).map((memory: any) => {
                            const importance = memory.metadata?.importance || 0;
                            const reasoning = memory.metadata?.reasoning;

                            return (
                              <div
                                key={memory._id}
                                className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50"
                              >
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-start gap-2">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getImportanceBadge(importance)}`}
                                      title={`Importance: ${importance}/10`}
                                    >
                                      {importance}
                                    </span>
                                    <p className="text-sm flex-1">
                                      {memory.content}
                                    </p>
                                  </div>

                                  {showReasoning && reasoning && (
                                    <p className="text-xs text-muted-foreground italic pl-8">
                                      "{reasoning}"
                                    </p>
                                  )}

                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    {/* Confidence badge - show if < 0.8 */}
                                    {memory.metadata?.confidence &&
                                      memory.metadata.confidence < 0.8 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20">
                                          {Math.round(memory.metadata.confidence * 100)}% confidence
                                        </span>
                                      )}

                                    {/* Expiration date badge */}
                                    {memory.metadata?.expiresAt && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-500/10 text-orange-600 dark:text-orange-500 border border-orange-500/20">
                                        Expires:{" "}
                                        {new Date(memory.metadata.expiresAt).toLocaleDateString()}
                                      </span>
                                    )}

                                    {/* Version badge - show if > 1 */}
                                    {memory.metadata?.version &&
                                      memory.metadata.version > 1 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-600 dark:text-blue-500 border border-blue-500/20">
                                          v{memory.metadata.version}
                                        </span>
                                      )}

                                    <span className="flex items-center gap-1 text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      {formatDistanceToNow(memory.createdAt, {
                                        addSuffix: true,
                                      })}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(memory._id)}
                                  className="h-8 w-8 shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                },
              )}
            </div>
          )}
        </div>
      </ScrollArea>

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

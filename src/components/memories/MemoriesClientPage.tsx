"use client";

import { MemoryFilters } from "@/components/memories/MemoryFilters";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";
import { useDebounce } from "@/hooks/useDebounce";
import { useAction, useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  Brain,
  Calendar,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
} from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

export function MemoriesClientPage() {
  const router = useRouter();

  // URL state for filters and UI toggles
  const [showReasoning, setShowReasoning] = useQueryState(
    "showReasoning",
    parseAsBoolean.withDefault(false),
  );

  const [categoryFilter, setCategoryFilter] = useQueryState(
    "category",
    parseAsStringEnum([
      "identity",
      "preference",
      "project",
      "context",
      "relationship",
    ]),
  );

  const [sortBy, setSortBy] = useQueryState(
    "sort",
    parseAsStringEnum(["date", "importance", "confidence"]).withDefault("date"),
  );

  // Immediate input state (updates URL instantly for shareable links)
  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );

  // Debounced value (only triggers query after 300ms idle)
  const debouncedSearchQuery = useDebounce(searchParam, 300);

  // @ts-ignore - Type instantiation is excessively deep and possibly infinite
  // @ts-ignore - Type instantiation is excessively deep and possibly infinite
  const memories = useQuery(api.memories.listFiltered, {
    category: categoryFilter || undefined,
    sortBy: sortBy || undefined,
    searchQuery: debouncedSearchQuery || undefined,
  });

  const deleteMemory = useMutation(api.memories.deleteMemory);
  const deleteAllMemories = useMutation(api.memories.deleteAllMemories);
  const consolidateMemories = useAction(api.memories.consolidateUserMemories);
  const [_isDeleting, setIsDeleting] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory({ id: id as any });
      toast.success("Memory deleted");
    } catch (_error) {
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
    } catch (_error) {
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
                onClick={() => setShowReasoning(!showReasoning)}
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

      </div>

      {/* Filters */}
      <div className="flex-none z-40 bg-background/80 backdrop-blur-sm border-b border-border/40">
        <div className="container mx-auto max-w-6xl px-4 py-3">
          <MemoryFilters
            category={categoryFilter}
            setCategory={setCategoryFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            searchQuery={searchParam}
            setSearchQuery={setSearchParam}
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          {memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-muted/30 p-4 rounded-full mb-4 ring-1 ring-border/50">
                <Brain className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-foreground/90">
                No memories found
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                As you chat, the AI will automatically extract and organize important details about you and your preferences.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedMemories).map(
                ([category, categoryMemories]: [string, any]) => {
                  const label = categoryLabels[category] || {
                    title: category,
                    description: "Other memories",
                  };

                  return (
                    <div key={category} className="space-y-4">
                      <div className="px-1">
                        <h3 className="text-sm font-semibold text-foreground/90 flex items-center gap-2">
                          {label.title}
                          <span className="text-xs font-normal text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                            {categoryMemories.length}
                          </span>
                        </h3>
                      </div>

                      <div className="border border-border/40 rounded-lg overflow-hidden bg-card/30">
                        <div className="divide-y divide-border/40">
                          {(categoryMemories || []).map((memory: any) => {
                            const importance = memory.metadata?.importance || 0;
                            const reasoning = memory.metadata?.reasoning;

                            return (
                              <div
                                key={memory._id}
                                className="group flex items-start justify-between gap-4 p-4 hover:bg-muted/40 transition-colors"
                              >
                                <div className="flex-1 space-y-2 min-w-0">
                                  <div className="flex items-start gap-3">
                                    <span
                                      className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-medium ${getImportanceBadge(importance)}`}
                                      title={`Importance: ${importance}/10`}
                                    >
                                      {importance}
                                    </span>
                                    <div className="flex-1 min-w-0 space-y-1">
                                      <p className="text-sm text-foreground/90 leading-relaxed break-words">
                                        {memory.content}
                                      </p>

                                      {showReasoning && reasoning && (
                                        <p className="text-xs text-muted-foreground italic border-l-2 border-border/60 pl-2 ml-0.5">
                                          "{reasoning}"
                                        </p>
                                      )}

                                      <div className="flex flex-wrap items-center gap-2 pt-1">
                                        {/* Meta Badges */}
                                        {/* Confidence badge - show if < 0.8 */}
                                        {memory.metadata?.confidence &&
                                          memory.metadata.confidence < 0.8 && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20">
                                              {Math.round(memory.metadata.confidence * 100)}% conf.
                                            </span>
                                          )}

                                        {/* Expiration date badge */}
                                        {memory.metadata?.expiresAt && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-500 border border-orange-500/20">
                                            Exp: {new Date(memory.metadata.expiresAt).toLocaleDateString()}
                                          </span>
                                        )}

                                        {/* Version badge - show if > 1 */}
                                        {memory.metadata?.version &&
                                          memory.metadata.version > 1 && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-500 border border-blue-500/20">
                                              v{memory.metadata.version}
                                            </span>
                                          )}

                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                                          <Calendar className="h-3 w-3" />
                                          {formatDistanceToNow(memory.createdAt, { addSuffix: true })}
                                        </span>

                                        {/* View source button */}
                                        {(memory.sourceMessageId ||
                                          (memory.sourceMessageIds &&
                                            memory.sourceMessageIds.length > 0)) && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 px-1.5 text-[10px] text-muted-foreground/60 hover:text-foreground -ml-1"
                                            onClick={() => {
                                              const messageId =
                                                memory.sourceMessageId ||
                                                memory.sourceMessageIds?.[0];
                                              const convId = memory.conversationId;
                                              if (convId && messageId) {
                                                router.push(
                                                  `/chat/${convId}?messageId=${messageId}`,
                                                );
                                              }
                                            }}
                                          >
                                            <ExternalLink className="h-2.5 w-2.5 mr-1" />
                                            Source
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete memory?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete this memory. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(memory._id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
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

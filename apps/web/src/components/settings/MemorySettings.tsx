"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { Brain, Eye, EyeOff, Loader2, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";
import { AddMemoryDialog } from "@/components/memories/AddMemoryDialog";
import { DeleteAllMemoriesDialog } from "@/components/memories/DeleteAllMemoriesDialog";
import { MemoryFilters } from "@/components/memories/MemoryFilters";
import { MemoryItem } from "@/components/memories/MemoryItem";
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

type Category =
  | "identity"
  | "preference"
  | "project"
  | "context"
  | "relationship";
type SortBy = "date" | "importance" | "confidence";

const CATEGORY_LABELS: Record<string, { title: string; description: string }> =
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

export function MemorySettings() {
  const router = useRouter();

  // Local filter state
  const [showReasoning, setShowReasoning] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [searchQuery, setSearchQuery] = useState("");

  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 300);

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);

  // @ts-ignore - Type instantiation is excessively deep and possibly infinite
  const memories = useQuery(api.memories.listFiltered, {
    category: categoryFilter || undefined,
    sortBy: sortBy || undefined,
    searchQuery: debouncedSearchQuery || undefined,
  });

  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const createMemory = useMutation(api.memories.createManual);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const deleteMemory = useMutation(api.memories.deleteMemory);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const deleteAllMemories = useMutation(api.memories.deleteAllMemories);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const scanRecentConversations = useMutation(
    api.memories.scanRecentConversations,
  );
  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const consolidateMemories = useAction(api.memories.consolidateUserMemories);

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

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory({ id: id as any });
      toast.success("Memory deleted");
    } catch (_error) {
      toast.error("Failed to delete memory");
    }
  };

  const handleDeleteAll = async () => {
    const result = await deleteAllMemories({});
    toast.success(`Deleted ${result.deleted} memories`);
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

  const handleNavigateToSource = (
    conversationId: string,
    messageId: string,
  ) => {
    router.push(`/chat/${conversationId}?messageId=${messageId}`);
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

  // Group memories by category
  const groupedMemories = (memories || []).reduce<
    Record<string, Doc<"memories">[]>
  >((acc, memory: Doc<"memories">) => {
    const category = (memory.metadata?.category as string) || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(memory);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Actions Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Memory Settings</CardTitle>
              <CardDescription>
                Control how AI extracts and remembers facts from conversations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <AddMemoryDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onAdd={handleAddMemory}
              />
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
          </div>
        </CardHeader>
        <CardContent>
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

      {/* Filters & Memories Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Memories</CardTitle>
              <CardDescription>
                {memories?.length || 0} memories stored
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReasoning(!showReasoning)}
              className="gap-2"
            >
              {showReasoning ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {showReasoning ? "Hide" : "Show"} Reasoning
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <MemoryFilters
            category={categoryFilter}
            setCategory={setCategoryFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* Memory List */}
          {memories === undefined ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-muted/30 p-4 rounded-full mb-4 ring-1 ring-border/50">
                <Brain className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-foreground/90">
                No memories found
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                As you chat, the AI will automatically extract and organize
                important details about you and your preferences.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMemories).map(
                ([category, categoryMemories]) => {
                  const label = CATEGORY_LABELS[category] || {
                    title: category,
                    description: "Other memories",
                  };

                  return (
                    <div key={category} className="space-y-2">
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
                          {categoryMemories.map((memory: Doc<"memories">) => (
                            <MemoryItem
                              key={memory._id}
                              memory={memory}
                              showReasoning={showReasoning}
                              onDelete={handleDelete}
                              onNavigateToSource={handleNavigateToSource}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                },
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

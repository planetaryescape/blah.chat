"use client";

import { DeleteAllMemoriesDialog } from "@/components/memories/DeleteAllMemoriesDialog";
import { MemoriesHeader } from "@/components/memories/MemoriesHeader";
import { MemoryFilters } from "@/components/memories/MemoryFilters";
import { MemoryItem } from "@/components/memories/MemoryItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";
import { useDebounce } from "@/hooks/useDebounce";
import { useAction, useMutation, useQuery } from "convex/react";
import { Brain, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
} from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

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

  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );

  const debouncedSearchQuery = useDebounce(searchParam, 300);

  // @ts-ignore - Type instantiation is excessively deep and possibly infinite
  const memories = useQuery(api.memories.listFiltered, {
    category: categoryFilter || undefined,
    sortBy: sortBy || undefined,
    searchQuery: debouncedSearchQuery || undefined,
  });

  const deleteMemory = useMutation(api.memories.deleteMemory);
  const deleteAllMemories = useMutation(api.memories.deleteAllMemories);
  const consolidateMemories = useAction(api.memories.consolidateUserMemories);

  const [isConsolidating, setIsConsolidating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  if (memories === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const groupedMemories = memories.reduce<Record<string, typeof memories>>(
    (acc, memory: any) => {
      const category = (memory.metadata?.category as string) || "other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(memory);
      return acc;
    },
    {},
  );

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      <MemoriesHeader
        showReasoning={showReasoning}
        onToggleReasoning={() => setShowReasoning(!showReasoning)}
        memoriesCount={memories.length}
        isConsolidating={isConsolidating}
        onConsolidate={handleConsolidate}
        onShowDeleteDialog={() => setShowDeleteDialog(true)}
      />

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
                As you chat, the AI will automatically extract and organize
                important details about you and your preferences.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedMemories).map(
                ([category, categoryMemories]) => {
                  const label = CATEGORY_LABELS[category] || {
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
                          {categoryMemories.map((memory: any) => (
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
        </div>
      </ScrollArea>

      <DeleteAllMemoriesDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        memoriesCount={memories.length}
        onConfirm={handleDeleteAll}
      />
    </div>
  );
}

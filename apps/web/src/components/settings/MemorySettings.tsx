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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUserPreference } from "@/hooks/useUserPreference";

type MemoryExtractionLevel =
  | "none"
  | "passive"
  | "minimal"
  | "moderate"
  | "active"
  | "aggressive";

const EXTRACTION_LEVELS: {
  value: MemoryExtractionLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "none",
    label: "Off",
    description: "No memory extraction or retrieval. Complete privacy.",
  },
  {
    value: "passive",
    label: "Manual",
    description: 'Only saves when you say "remember this".',
  },
  {
    value: "minimal",
    label: "Essential",
    description: "Auto-saves only critical facts like name and primary role.",
  },
  {
    value: "moderate",
    label: "Standard",
    description: "Auto-saves important facts and preferences. Recommended.",
  },
  {
    value: "active",
    label: "Proactive",
    description:
      "Liberal saving. AI checks your memories before every response.",
  },
  {
    value: "aggressive",
    label: "Maximum",
    description: "Saves everything. AI always searches all your personal data.",
  },
];

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

  // Extraction level state
  const currentLevel = useUserPreference(
    "memoryExtractionLevel",
  ) as MemoryExtractionLevel;
  const [pendingLevel, setPendingLevel] =
    useState<MemoryExtractionLevel | null>(null);
  const [showAggressiveWarning, setShowAggressiveWarning] = useState(false);

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
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updatePreferences = useMutation(api.users.updatePreferences);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleExtractionLevelChange = async (
    newLevel: MemoryExtractionLevel,
  ) => {
    // Show warning for aggressive level
    if (newLevel === "aggressive" && currentLevel !== "aggressive") {
      setPendingLevel(newLevel);
      setShowAggressiveWarning(true);
      return;
    }

    await saveExtractionLevel(newLevel);
  };

  const saveExtractionLevel = async (level: MemoryExtractionLevel) => {
    try {
      await updatePreferences({
        preferences: { memoryExtractionLevel: level },
      });
      toast.success(
        `Memory extraction set to "${EXTRACTION_LEVELS.find((l) => l.value === level)?.label}"`,
      );
    } catch (_error) {
      toast.error("Failed to update memory settings");
    }
  };

  const confirmAggressiveLevel = async () => {
    if (pendingLevel) {
      await saveExtractionLevel(pendingLevel);
      setPendingLevel(null);
    }
    setShowAggressiveWarning(false);
  };

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
      {/* Extraction Level Card */}
      <Card>
        <CardHeader>
          <CardTitle>Memory Extraction Level</CardTitle>
          <CardDescription>
            Control how aggressively AI extracts and remembers facts from
            conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={currentLevel}
            onValueChange={(value) =>
              handleExtractionLevelChange(value as MemoryExtractionLevel)
            }
            className="space-y-3"
          >
            {EXTRACTION_LEVELS.map((level) => (
              <Label
                key={level.value}
                htmlFor={`level-${level.value}`}
                className="flex items-start gap-3 rounded-lg border border-border/50 p-3 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <RadioGroupItem
                  value={level.value}
                  id={`level-${level.value}`}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="font-medium leading-none">{level.label}</div>
                  <div className="text-sm text-muted-foreground leading-snug">
                    {level.description}
                  </div>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Memory Actions</CardTitle>
              <CardDescription>
                Manage and organize your stored memories
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

      {/* Aggressive Level Warning Dialog */}
      <AlertDialog
        open={showAggressiveWarning}
        onOpenChange={setShowAggressiveWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable aggressive memory?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Aggressive mode saves almost everything you share, including
                minor preferences, tools mentioned in passing, and inferred
                patterns.
              </p>
              <p>
                You can review and delete any memories at any time from this
                settings page. Your data stays private and is only used to
                personalize your experience.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingLevel(null);
                setShowAggressiveWarning(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmAggressiveLevel}>
              Enable Aggressive Mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

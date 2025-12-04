"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function MemoriesPage() {
  const memories = useQuery(api.memories.list);
  const deleteMemory = useMutation(api.memories.deleteMemory);

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory({ id: id as any });
      toast.success("Memory deleted");
    } catch (error) {
      toast.error("Failed to delete memory");
    }
  };

  if (memories === undefined) {
    return (
      <div className="container mx-auto max-w-6xl py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const groupedMemories = memories.reduce<Record<string, typeof memories>>((acc, memory) => {
    const category = memory.metadata?.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(memory);
    return acc;
  }, {});

  const categoryLabels: Record<string, { title: string; description: string }> = {
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
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Memories</h1>
        <p className="text-muted-foreground">
          AI-extracted facts from your conversations. These help personalize responses.
        </p>
      </div>

      {memories.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-8">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No memories yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                As you chat, AI will automatically extract memorable facts. You can also manually
                trigger extraction using the "Extract Memories" button in any conversation.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMemories).map(([category, categoryMemories]) => {
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
                    {categoryMemories.map((memory) => (
                      <div
                        key={memory._id}
                        className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex-1 space-y-1">
                          <p className="text-sm">{memory.content}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(memory.createdAt, { addSuffix: true })}
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
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

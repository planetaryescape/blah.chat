"use client";

import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { TaskListItem } from "./TaskListItem";

interface TaskMainViewProps {
  title: string;
  tasks: any[];
  view: string;
  projectId?: Id<"projects"> | null;
  selectedTaskId?: Id<"tasks"> | null;
  onTaskSelect?: (id: Id<"tasks"> | null) => void;
}

export function TaskMainView({
  title,
  tasks,
  view,
  projectId,
  selectedTaskId,
  onTaskSelect,
}: TaskMainViewProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  // @ts-ignore - Type depth exceeded
  const createTask = useMutation(api.tasks.create);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await createTask({
        title: newTaskTitle.trim(),
        status: "in_progress",
        projectId: projectId || undefined,
        urgency: view === "important" ? "urgent" : "medium",
        deadline: view === "today" ? Date.now() : undefined,
        sourceType: "manual",
      });
      setNewTaskTitle("");
      // Sound effect?
    } catch (_error) {
      toast.error("Failed to create task");
    }
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex-none z-10 bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm">
        <div className="p-6 pb-4">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {view === "today" && (
              <p className="text-sm text-muted-foreground mt-1">
                {currentDate}
              </p>
            )}
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1 px-6">
        <div className="space-y-1 pb-4">
          {/* Incomplete Tasks */}
          {tasks
            .filter((t) => t.status !== "completed")
            .map((task) => (
              <TaskListItem
                key={task._id}
                task={task}
                onClick={() => onTaskSelect?.(task._id)}
                isSelected={selectedTaskId === task._id}
              />
            ))}

          {/* Completed Tasks Accordion? Or just list at bottom */}
          {tasks.some((t) => t.status === "completed") && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 px-2">
                Completed
              </h3>
              <div className="opacity-70">
                {tasks
                  .filter((t) => t.status === "completed")
                  .map((task) => (
                    <TaskListItem
                      key={task._id}
                      task={task}
                      onClick={() => onTaskSelect?.(task._id)}
                      isSelected={selectedTaskId === task._id}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-6 pt-2">
        <form
          onSubmit={handleCreateTask}
          className="flex items-center gap-2 bg-secondary/80 p-3 rounded-md hover:bg-secondary transition-colors group focus-within:bg-background focus-within:ring-1 focus-within:ring-primary focus-within:shadow-lg"
        >
          <Plus className="h-5 w-5 text-muted-foreground group-focus-within:text-primary" />
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a task"
            className="border-none bg-transparent shadow-none focus-visible:ring-0 px-2 h-auto py-1 text-base placeholder:text-muted-foreground/70"
          />
          {newTaskTitle && (
            <Button size="sm" type="submit" variant="ghost">
              Add
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

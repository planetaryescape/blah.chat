"use client";

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { Calendar, Star, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TaskListItemProps {
  task: any; // Using explicit any as in original file to match schema flexibility
  onClick?: () => void;
  isSelected?: boolean;
}

export function TaskListItem({ task, onClick, isSelected }: TaskListItemProps) {
  // @ts-ignore - Type depth exceeded with complex Convex mutation
  const updateTask = useMutation(api.tasks.update);
  // @ts-ignore
  const deleteTask = useMutation(api.tasks.deleteTask);

  const handleDelete = async () => {
    try {
      await deleteTask({ id: task._id });
      toast.success("Task deleted");
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  // @ts-ignore - Type depth exceeded
  const project = useQuery(
    api.projects.get,
    task.projectId ? { id: task.projectId } : "skip",
  );

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateTask({
        id: task._id,
        status: task.status === "completed" ? "in_progress" : "completed",
      });
      // Optional: play sound
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleToggleUrgency = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newUrgency = task.urgency === "urgent" ? "low" : "urgent";
    try {
      await updateTask({
        id: task._id,
        urgency: newUrgency,
      });
    } catch (error) {
      toast.error("Failed to update importance");
    }
  };

  const isCompleted = task.status === "completed";
  const isImportant = task.urgency === "urgent" || task.urgency === "high"; // Treating High/Urgent as "Important" star
  const hasDeadline = task.deadline !== undefined;
  const deadlineOverdue = hasDeadline && new Date(task.deadline) < new Date();

  // Check if task is added to "My Day" (deadline is today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isMyDay = task.deadline && new Date(task.deadline) >= today && new Date(task.deadline) < tomorrow;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            "group flex items-start gap-3 p-3 rounded-md hover:bg-secondary/50 cursor-pointer transition-colors bg-card mb-1 border-none shadow-sm",
            isCompleted && "bg-transparent hover:bg-secondary/30 opacity-75",
            isSelected && "bg-secondary/80 dark:bg-secondary/60",
          )}
          onClick={onClick}
        >
          <div
            className="flex items-center justify-center h-5 w-5 rounded-full border border-primary/50 hover:bg-primary/10 cursor-pointer transition-colors mt-0.5 shrink-0"
            onClick={handleToggleStatus}
          >
            {isCompleted && <div className="h-3 w-3 rounded-full bg-primary" />}
          </div>

          <div className="flex-1 min-w-0">
            <span
              className={cn(
                "text-sm font-medium truncate block",
                isCompleted && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
              {isMyDay && (
                <span className="flex items-center gap-1 text-blue-500">
                  <Sun className="h-3 w-3 fill-current" />
                  <span className="font-medium">My Day</span>
                </span>
              )}
              {/* Status indicator - only show non-completed status */}
              {!isCompleted && task.status === "in_progress" && (
                <span className="flex items-center gap-1 text-cyan-500">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  <span>In Progress</span>
                </span>
              )}
              {!isCompleted && task.status === "suggested" && (
                <span className="flex items-center gap-1 text-purple-500">
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  <span>Suggested</span>
                </span>
              )}
              {!isCompleted && task.status === "confirmed" && (
                <span className="flex items-center gap-1 text-amber-500">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>Confirmed</span>
                </span>
              )}
              {/* Urgency indicator */}
              {task.urgency === "urgent" && (
                <span className="flex items-center gap-1 text-red-500 font-medium">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span>Urgent</span>
                </span>
              )}
              {task.urgency === "high" && (
                <span className="flex items-center gap-1 text-orange-500">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  <span>High</span>
                </span>
              )}
              {task.projectId && (
                <span className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  {project?.name || "Project"}
                </span>
              )}
              {task.tags?.map((tag: string) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px]"
                >
                  {tag}
                </span>
              ))}
              {task.deadline && (
                <span
                  className={cn(
                    "flex items-center gap-1",
                    deadlineOverdue &&
                      !isCompleted &&
                      "text-destructive font-medium",
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.deadline), "MMM d")}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleToggleUrgency}
            className={cn(
              "p-1 hover:bg-secondary rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100",
              isImportant && "opacity-100",
            )}
          >
            <Star
              className={cn(
                "h-4 w-4",
                isImportant
                  ? "fill-primary text-primary"
                  : "text-muted-foreground",
              )}
            />
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

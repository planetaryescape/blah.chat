"use client";

import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDeadline, isOverdue } from "@/lib/utils/date";
import { useMutation, useQuery } from "convex/react";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface TaskListItemProps {
  task: any; // Using explicit any as in original file to match schema flexibility
  onClick?: () => void;
}

export function TaskListItem({ task, onClick }: TaskListItemProps) {
  // @ts-ignore - Type depth exceeded with complex Convex mutation
  const updateTask = useMutation(api.tasks.update);

  // @ts-ignore - Type depth exceeded
  const project = useQuery(
    api.projects.get,
    task.projectId ? { id: task.projectId } : "skip"
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
  const deadlineOverdue = hasDeadline && isOverdue(task.deadline);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-3 rounded-md hover:bg-secondary/50 cursor-pointer transition-colors bg-card mb-1 border-none shadow-sm",
        isCompleted && "bg-transparent hover:bg-secondary/30 opacity-75"
      )}
      onClick={onClick}
    >
      <div
        className="flex items-center justify-center h-5 w-5 rounded-full border border-primary/50 hover:bg-primary/10 cursor-pointer transition-colors"
        onClick={handleToggleStatus}
      >
        {isCompleted && (
          <div className="h-3 w-3 rounded-full bg-primary" />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <span className={cn(
          "text-sm font-normal truncate",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {task.title}
        </span>

        <div className="flex items-center gap-2 text-xs text-muted-foreground min-h-[1.25em]">
          {project && (
            <span className="truncate max-w-[150px]">{project.name}</span>
          )}
          {project && hasDeadline && <span>•</span>}
          {hasDeadline && (
            <span className={cn(deadlineOverdue && !isCompleted && "text-red-500")}>
              {formatDeadline(task.deadline)}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={handleToggleUrgency}
        className={cn(
          "p-1 hover:bg-secondary rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100",
          isImportant && "opacity-100"
        )}
      >
        <Star
          className={cn(
            "h-4 w-4",
            isImportant ? "fill-primary text-primary" : "text-muted-foreground"
          )}
        />
      </button>
    </div>
  );
}

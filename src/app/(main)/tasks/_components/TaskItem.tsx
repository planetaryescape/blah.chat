"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatDeadline, isOverdue } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const URGENCY_COLORS = {
  low: "bg-gray-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export function TaskItem({ task }: { task: any }) {
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const updateTask = useMutation(api.tasks.update);
  // @ts-ignore - Type depth exceeded
  const project = useQuery(
    api.projects.get,
    task.projectId ? { id: task.projectId } : "skip",
  );

  const handleToggle = async () => {
    try {
      await updateTask({
        id: task._id,
        status: task.status === "completed" ? "in_progress" : "completed",
      });
      toast.success(
        task.status === "completed" ? "Task reopened" : "Task completed",
      );
    } catch (error: any) {
      toast.error("Failed to update task");
    }
  };

  const isCompleted = task.status === "completed";
  const hasDeadline = task.deadline !== undefined;
  const deadlineOverdue = hasDeadline && isOverdue(task.deadline);

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleToggle}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                "font-medium",
                isCompleted && "line-through opacity-60",
              )}
            >
              {task.title}
            </h4>
            <div className="flex gap-1.5">
              {task.urgency && (
                <Badge
                  className={cn(
                    URGENCY_COLORS[task.urgency as keyof typeof URGENCY_COLORS],
                    "text-white text-xs",
                  )}
                >
                  {task.urgency}
                </Badge>
              )}
              {project && (
                <Badge variant="outline" className="text-xs">
                  {project.name}
                </Badge>
              )}
            </div>
          </div>

          {hasDeadline && (
            <p
              className={cn(
                "text-sm mt-1",
                deadlineOverdue && !isCompleted
                  ? "text-red-600 font-medium"
                  : "text-muted-foreground",
              )}
            >
              {formatDeadline(task.deadline)}
            </p>
          )}

          {task.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {task.description}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

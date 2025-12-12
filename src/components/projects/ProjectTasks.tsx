"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Plus } from "lucide-react";
import { toast } from "sonner";

const URGENCY_COLORS = {
  low: "bg-gray-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export function ProjectTasks({
  projectId,
  tasks,
}: {
  projectId: Id<"projects">;
  tasks: any[];
}) {
  // @ts-ignore - Type depth exceeded
  const updateTask = useMutation(api.tasks.update);

  const handleToggleComplete = async (taskId: Id<"tasks">, currentStatus: string) => {
    try {
      await updateTask({
        taskId,
        status: currentStatus === "completed" ? "in_progress" : "completed",
      });
      toast.success(
        currentStatus === "completed" ? "Task reopened" : "Task completed"
      );
    } catch (error: any) {
      toast.error("Failed to update task");
    }
  };

  const activeTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  if (tasks.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckSquare className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="font-medium">No tasks yet</h3>
            <p className="text-sm text-muted-foreground">
              Extract tasks from meetings or create them manually
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Active Tasks ({activeTasks.length})</h3>
          <div className="grid gap-3">
            {activeTasks.map((task) => (
              <Card key={task._id} className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => handleToggleComplete(task._id, task.status)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium">{task.title}</h4>
                      {task.urgency && (
                        <Badge
                          className={`${URGENCY_COLORS[task.urgency as keyof typeof URGENCY_COLORS]} text-white`}
                        >
                          {task.urgency}
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                    {task.deadline && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Due: {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-muted-foreground">
            Completed ({completedTasks.length})
          </h3>
          <div className="grid gap-3">
            {completedTasks.map((task) => (
              <Card key={task._id} className="p-4 opacity-60">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={true}
                    onCheckedChange={() => handleToggleComplete(task._id, task.status)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium line-through">{task.title}</h4>
                    {task.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-through">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { CreateTaskDialog } from "@/app/(main)/tasks/_components/CreateTaskDialog";
import { TaskListItem } from "@/app/(main)/tasks/_components/TaskListItem";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { use, useState } from "react";

export default function ProjectTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = id as Id<"projects">;
  // @ts-ignore - Type depth exceeded
  const tasks = useQuery(api.tasks.list, { projectId });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (tasks === undefined) {
    return <div className="p-8 text-muted-foreground">Loading tasks...</div>;
  }

  const activeTasks = tasks.filter((t: any) => t.status !== "completed");
  const completedTasks = tasks.filter((t: any) => t.status === "completed");

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-4 border-b flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <span className="text-muted-foreground text-sm">
            {activeTasks.length} active
          </span>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto py-6 px-6">
          {activeTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p>No tasks yet.</p>
              <Button
                variant="link"
                onClick={() => setIsCreateOpen(true)}
                className="mt-2"
              >
                Create your first task
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Active Tasks */}
              <div className="space-y-1">
                {activeTasks.map((task: any) => (
                  <TaskListItem key={task._id} task={task} />
                ))}
              </div>

              {/* Completed Tasks - Collapsible? For now just list */}
              {completedTasks.length > 0 && (
                <div className="pt-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                    Completed
                  </h3>
                  <div className="space-y-1 opacity-60 hover:opacity-100 transition-opacity">
                    {completedTasks.map((task: any) => (
                      <TaskListItem key={task._id} task={task} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <CreateTaskDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultProjectId={projectId}
      />
    </div>
  );
}

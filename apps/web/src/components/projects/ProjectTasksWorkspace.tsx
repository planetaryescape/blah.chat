"use client";

import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Circle, Plus, Save, Trash2 } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { type ProjectTask, useProjectTasks } from "@/hooks/useProjectTasks";
import { cn } from "@/lib/utils";

const urgencyTone: Record<string, string> = {
  low: "bg-slate-500",
  medium: "bg-sky-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

function toDateInput(value?: number) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function toDeadline(dateValue: string) {
  if (!dateValue) {
    return undefined;
  }

  return new Date(`${dateValue}T23:59:59.999`).getTime();
}

export function ProjectTasksWorkspace({ projectId }: { projectId: string }) {
  const { isMobile } = useMobileDetect();
  const [taskParam, setTaskParam] = useQueryState("task");
  const {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    isUpdating,
    isCreating,
  } = useProjectTasks(projectId);
  const [draftTitle, setDraftTitle] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectTask["status"]>("in_progress");
  const [urgency, setUrgency] =
    useState<NonNullable<ProjectTask["urgency"]>>("medium");
  const [deadline, setDeadline] = useState("");

  const selectedTask = useMemo(
    () => tasks.find((task) => task._id === taskParam) ?? null,
    [taskParam, tasks],
  );

  useEffect(() => {
    if (taskParam && !selectedTask && tasks.length > 0) {
      void setTaskParam(null);
    }
  }, [selectedTask, setTaskParam, taskParam, tasks.length]);

  useEffect(() => {
    if (!selectedTask) {
      setTitle("");
      setDescription("");
      setStatus("in_progress");
      setUrgency("medium");
      setDeadline("");
      return;
    }

    setTitle(selectedTask.title);
    setDescription(selectedTask.description ?? "");
    setStatus(selectedTask.status);
    setUrgency(selectedTask.urgency ?? "medium");
    setDeadline(toDateInput(selectedTask.deadline));
  }, [selectedTask]);

  const isDirty =
    selectedTask !== null &&
    (title !== selectedTask.title ||
      description !== (selectedTask.description ?? "") ||
      status !== selectedTask.status ||
      urgency !== (selectedTask.urgency ?? "medium") ||
      deadline !== toDateInput(selectedTask.deadline));

  async function persistTask(task: ProjectTask, silent = false) {
    await updateTask({
      taskId: task._id,
      title,
      description,
      status,
      urgency,
      deadline: toDeadline(deadline),
    });

    if (!silent) {
      toast.success("Task saved");
    }
  }

  async function handleSelectTask(nextId: string | null) {
    if (selectedTask && isDirty) {
      await persistTask(selectedTask, true);
    }
    await setTaskParam(nextId);
  }

  async function handleCreateTask(event: React.FormEvent) {
    event.preventDefault();
    if (!draftTitle.trim()) {
      return;
    }

    const task = await createTask({
      title: draftTitle.trim(),
      status: "in_progress",
      urgency: "medium",
    });
    setDraftTitle("");
    await setTaskParam(task._id);
    toast.success("Task created");
  }

  async function handleToggleTask(task: ProjectTask) {
    await updateTask({
      taskId: task._id,
      status: task.status === "completed" ? "in_progress" : "completed",
    });
  }

  async function handleDeleteTask() {
    if (!selectedTask) {
      return;
    }

    await deleteTask(selectedTask._id);
    await setTaskParam(null);
    toast.success("Task deleted");
  }

  const activeTasks = tasks.filter((task) => task.status !== "completed");
  const completedTasks = tasks.filter((task) => task.status === "completed");

  return (
    <div className="flex h-full bg-background">
      <div
        className={cn(
          "flex flex-col border-r w-96 min-w-[320px] bg-muted/5 transition-all",
          taskParam && isMobile ? "hidden" : "flex",
        )}
      >
        <div className="p-4 border-b space-y-3 sticky top-0 bg-muted/5 backdrop-blur z-10">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Tasks</h2>
            <Badge variant="secondary">{activeTasks.length} active</Badge>
          </div>
          <form onSubmit={handleCreateTask} className="flex gap-2">
            <Input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Add a project task"
            />
            <Button type="submit" disabled={!draftTitle.trim() || isCreating}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y divide-border/40">
            {(isLoading ? [] : [...activeTasks, ...completedTasks]).map(
              (task) => (
                <button
                  key={task._id}
                  type="button"
                  onClick={() => void handleSelectTask(task._id)}
                  className={cn(
                    "w-full text-left px-4 py-3.5 transition-colors hover:bg-muted/30",
                    taskParam === task._id && "bg-secondary",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="pt-0.5"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleToggleTask(task);
                      }}
                    >
                      {task.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-sm font-medium truncate",
                              task.status === "completed" &&
                                "line-through text-muted-foreground",
                            )}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                        {task.urgency && (
                          <Badge
                            className={cn(
                              "text-white shrink-0",
                              urgencyTone[task.urgency],
                            )}
                          >
                            {task.urgency}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 mt-2">
                        Updated{" "}
                        {formatDistanceToNow(task.updatedAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ),
            )}
            {!isLoading && tasks.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No tasks in this project yet.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div
        className={cn(
          "flex-1 flex flex-col min-h-0 bg-background",
          !taskParam && isMobile ? "hidden" : "flex",
        )}
      >
        {selectedTask ? (
          <>
            <div className="flex items-center justify-between px-6 py-3 border-b bg-background/70 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground">
                Updated{" "}
                {formatDistanceToNow(selectedTask.updatedAt, {
                  addSuffix: true,
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => void persistTask(selectedTask)}
                  disabled={!isDirty || isUpdating}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete task?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the project task from the Postgres store.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleDeleteTask()}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-6 space-y-4">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => {
                  if (selectedTask && isDirty) {
                    void persistTask(selectedTask, true);
                  }
                }}
                className="text-xl font-semibold"
                placeholder="Task title"
              />
              <div className="grid gap-4 md:grid-cols-3">
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as ProjectTask["status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggested">Suggested</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={urgency}
                  onValueChange={(value) =>
                    setUrgency(value as NonNullable<ProjectTask["urgency"]>)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                />
              </div>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onBlur={() => {
                  if (selectedTask && isDirty) {
                    void persistTask(selectedTask, true);
                  }
                }}
                placeholder="Task details"
                className="min-h-[40vh] resize-none"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>Select a task to view</p>
              <p className="text-sm mt-2">
                Create one from the input on the left.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

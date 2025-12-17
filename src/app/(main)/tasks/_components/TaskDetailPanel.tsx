"use client";

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
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { NotebookPen, Star, Sun, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface TaskDetailPanelProps {
  taskId: Id<"tasks">;
  onClose: () => void;
}

export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  // @ts-ignore - Type depth exceeded
  const task = useQuery(api.tasks.get, { id: taskId });
  // @ts-ignore
  const updateTask = useMutation(api.tasks.update);
  // @ts-ignore
  const deleteTask = useMutation(api.tasks.deleteTask);
  // @ts-ignore
  const projects = useQuery(api.projects.list);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state with task data
  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
    }
  }, [task]);

  const handleSave = async (updates: Record<string, any>) => {
    setIsSaving(true);
    try {
      await updateTask({ id: taskId, ...updates });
    } catch (error) {
      toast.error("Failed to update task");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleBlur = () => {
    if (title !== task?.title) {
      handleSave({ title });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== task?.description) {
      handleSave({ description });
    }
  };

  const handleToggleImportant = () => {
    const newUrgency = task?.urgency === "urgent" ? "low" : "urgent";
    handleSave({ urgency: newUrgency });
  };

  const handleToggleMyDay = () => {
    // Toggle deadline to today or remove it
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const isToday =
      task?.deadline &&
      format(new Date(task.deadline), "yyyy-MM-dd") ===
        format(today, "yyyy-MM-dd");
    handleSave({ deadline: isToday ? undefined : today.getTime() });
  };

  const handleDelete = async () => {
    try {
      await deleteTask({ id: taskId });
      toast.success("Task deleted");
      onClose();
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const handleStatusChange = (status: string) => {
    handleSave({ status });
  };

  const handleProjectChange = (projectId: string) => {
    handleSave({
      projectId: projectId === "none" ? undefined : projectId,
    });
  };

  const handleUrgencyChange = (urgency: string) => {
    handleSave({ urgency });
  };

  if (!task) {
    return (
      <div className="w-[360px] border-l bg-card flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isCompleted = task.status === "completed";
  const isImportant = task.urgency === "urgent" || task.urgency === "high";
  const isToday =
    task.deadline &&
    format(new Date(task.deadline), "yyyy-MM-dd") ===
      format(new Date(), "yyyy-MM-dd");

  return (
    <div className="w-[360px] border-l bg-card flex flex-col h-full">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm text-muted-foreground">
          Task Details
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Task Title */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex items-center justify-center h-5 w-5 rounded-full border cursor-pointer mt-1 shrink-0 transition-colors",
                isCompleted
                  ? "bg-primary border-primary"
                  : "border-primary/50 hover:bg-primary/10",
              )}
              onClick={() =>
                handleStatusChange(isCompleted ? "in_progress" : "completed")
              }
            >
              {isCompleted && (
                <div className="h-3 w-3 rounded-full bg-background" />
              )}
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className={cn(
                "border-none bg-transparent px-0 text-lg font-medium focus-visible:ring-0 shadow-none h-auto",
                isCompleted && "line-through text-muted-foreground",
              )}
              placeholder="Task title"
            />
          </div>

          {/* Quick Actions */}
          <div className="space-y-1">
            {/* Add to My Day */}
            <button
              onClick={handleToggleMyDay}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-md hover:bg-secondary/50 transition-colors text-sm",
                isToday && "text-primary",
              )}
            >
              <Sun className={cn("h-4 w-4", isToday && "fill-primary")} />
              <span>{isToday ? "Added to My Day" : "Add to My Day"}</span>
            </button>

            {/* Mark as Important */}
            <button
              onClick={handleToggleImportant}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-md hover:bg-secondary/50 transition-colors text-sm",
                isImportant && "text-primary",
              )}
            >
              <Star className={cn("h-4 w-4", isImportant && "fill-primary")} />
              <span>
                {isImportant ? "Marked as Important" : "Mark as Important"}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Status */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Status
            </label>
            <Select value={task.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suggested">Suggested</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority/Urgency */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Priority
            </label>
            <Select
              value={task.urgency || "medium"}
              onValueChange={handleUrgencyChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Project */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Project
            </label>
            <Select
              value={task.projectId || "none"}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects?.map((project: any) => (
                  <SelectItem key={project._id} value={project._id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date - Always show to allow adding */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Due Date
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={
                  task.deadline
                    ? format(new Date(task.deadline), "yyyy-MM-dd")
                    : ""
                }
                onChange={(e) => {
                  if (e.target.value) {
                    const date = new Date(e.target.value);
                    date.setHours(23, 59, 59, 999);
                    handleSave({ deadline: date.getTime() });
                  }
                }}
                className="w-full px-3 py-2 text-sm rounded-md bg-secondary/50 border-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const today = new Date();
                    today.setHours(23, 59, 59, 999);
                    handleSave({ deadline: today.getTime() });
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 p-2 text-xs rounded-md bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <Sun className="h-3 w-3" />
                  Set Today
                </button>
                {task.deadline && (
                  <button
                    onClick={() => handleSave({ deadline: undefined })}
                    className="flex-1 flex items-center justify-center gap-1.5 p-2 text-xs rounded-md bg-secondary/50 hover:bg-destructive/20 text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <NotebookPen className="h-3 w-3" />
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Add description..."
              className="min-h-[120px] resize-none bg-secondary/30 border-none focus-visible:ring-1"
            />
          </div>

          {/* Created/Updated timestamps */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4">
            {task.createdAt && (
              <p>
                Created{" "}
                {format(new Date(task.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
            {task.updatedAt && task.updatedAt !== task.createdAt && (
              <p>
                Updated{" "}
                {format(new Date(task.updatedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer with delete */}
      <div className="p-4 border-t">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Task
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this task? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTaskCacheSync } from "@/hooks/useCacheSync";
import { cn } from "@/lib/utils";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { TaskMainView } from "./TaskMainView";
import { TasksSidebar } from "./TasksSidebar";

type ViewType = "all" | "today" | "upcoming" | "completed" | "important";

interface TasksDashboardProps {
  initialProjectId?: Id<"projects">;
  hideSidebar?: boolean;
}

export function TasksDashboard({
  initialProjectId,
  hideSidebar = false,
}: TasksDashboardProps) {
  const [view, setView] = useState<ViewType>(initialProjectId ? "all" : "all");
  const [projectFilter, setProjectFilter] = useState<Id<"projects"> | null>(
    initialProjectId || null,
  );

  // URL-persisted task selection (supports deep linking from search results)
  const [taskParam, setTaskParam] = useQueryState(
    "task",
    parseAsString.withDefault(""),
  );

  // Derive selectedTaskId from URL param
  const selectedTaskId = useMemo(() => {
    return taskParam ? (taskParam as Id<"tasks">) : null;
  }, [taskParam]);

  const setSelectedTaskId = useCallback(
    (id: Id<"tasks"> | null) => {
      setTaskParam(id || "");
    },
    [setTaskParam],
  );

  // Local-first: fetch all tasks, filter client-side
  const { tasks: allTasks, isLoading: tasksLoading } = useTaskCacheSync();

  // Helper: check if date is today
  const isToday = useCallback((timestamp: number | undefined) => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  // Helper: check if date is within next N days
  const isWithinDays = useCallback(
    (timestamp: number | undefined, days: number) => {
      if (!timestamp) return false;
      const date = new Date(timestamp);
      const today = new Date();
      const future = new Date();
      future.setDate(today.getDate() + days);
      return date >= today && date <= future;
    },
    [],
  );

  // Select active dataset with client-side filtering
  const { tasks, title } = useMemo(() => {
    let filtered: Doc<"tasks">[] = allTasks;

    switch (view) {
      case "today":
        filtered = allTasks.filter(
          (t) => t.status !== "completed" && isToday(t.deadline),
        );
        return { tasks: filtered, title: "My Day" };
      case "upcoming":
        filtered = allTasks.filter(
          (t) => t.status !== "completed" && isWithinDays(t.deadline, 7),
        );
        return { tasks: filtered, title: "Planned" };
      case "important":
        filtered = allTasks.filter(
          (t) =>
            t.status !== "completed" &&
            (t.urgency === "urgent" || t.urgency === "high"),
        );
        return { tasks: filtered, title: "Important" };
      case "completed":
        filtered = allTasks.filter((t) => t.status === "completed");
        if (projectFilter) {
          filtered = filtered.filter((t) => t.projectId === projectFilter);
        }
        return { tasks: filtered, title: "Completed" };
      default:
        filtered = allTasks.filter((t) => t.status !== "completed");
        if (projectFilter) {
          filtered = filtered.filter((t) => t.projectId === projectFilter);
        }
        return {
          tasks: filtered,
          title: projectFilter ? "Project Tasks" : "Tasks",
        };
    }
  }, [view, allTasks, projectFilter, isToday, isWithinDays]);

  // Special case: If projectFilter is set, we might want to fetch project name to display as Title
  // @ts-ignore
  const project = useQuery(
    api.projects.get,
    projectFilter ? { id: projectFilter } : "skip",
  );
  const displayTitle = projectFilter && project ? project.name : title;

  // Validate selected task exists in current tasks list
  const selectedTaskExists = useMemo(() => {
    if (!selectedTaskId || !tasks) return false;
    return tasks.some((t: { _id: string }) => t._id === selectedTaskId);
  }, [selectedTaskId, tasks]);

  // Clear invalid selection from URL (task doesn't exist or filtered out)
  useEffect(() => {
    if (selectedTaskId && tasks && tasks.length > 0 && !selectedTaskExists) {
      setTaskParam(null);
    }
  }, [selectedTaskId, tasks, selectedTaskExists, setTaskParam]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Assuming 4rem header height or similar global layout structure.
          If not, h-full might work if parent has height. */}

      <main
        className={cn(
          "flex w-full h-full overflow-hidden bg-background",
          !hideSidebar && "rounded-tl-xl border-t border-l shadow-2xl",
        )}
      >
        {!hideSidebar && (
          <TasksSidebar
            currentView={view}
            onViewChange={(v) => setView(v as ViewType)}
            projectFilter={projectFilter}
            onProjectFilterChange={setProjectFilter}
          />
        )}

        <TaskMainView
          title={displayTitle}
          tasks={tasks}
          view={view}
          projectId={projectFilter}
          selectedTaskId={selectedTaskId}
          onTaskSelect={setSelectedTaskId}
        />

        {/* Task Detail Panel - slides in from right */}
        {selectedTaskId && (
          <TaskDetailPanel
            taskId={selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
          />
        )}
      </main>
    </div>
  );
}

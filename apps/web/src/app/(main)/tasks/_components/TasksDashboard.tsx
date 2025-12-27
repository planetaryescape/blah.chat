"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
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

  // Queries
  const tasksAll = useQuery(
    // @ts-ignore - Type depth exceeded with 94+ Convex modules
    api.tasks.list,
    view === "all" ? { projectId: projectFilter || undefined } : "skip",
  );
  // @ts-ignore
  const tasksToday = useQuery(
    api.tasks.getToday,
    view === "today" ? {} : "skip",
  );
  // @ts-ignore
  const tasksUpcoming = useQuery(
    api.tasks.getUpcoming,
    view === "upcoming" ? { days: 7 } : "skip",
  );
  // @ts-ignore
  const tasksCompleted = useQuery(
    api.tasks.list,
    view === "completed"
      ? { status: "completed", projectId: projectFilter || undefined }
      : "skip",
  );
  // @ts-ignore - Fetching all tasks then filtering for Important,
  // or ideally we'd have a specific query. For now, let's fetch all and filter client side
  // if no specific endpoint exists, or assume 'urgency' filter support in list?
  // Checking list args: { status?: ..., projectId?: ..., urgency?: ... }
  // Let's optimize:
  const tasksImportant = useQuery(
    api.tasks.list,
    view === "important" ? { urgency: "urgent" } : "skip", // Assuming urgency filter works or 'urgent' | 'high'
  );

  // Select active dataset
  const { tasks, title } = useMemo(() => {
    // Projects logic
    // We need project name if filtering by project
    // But we don't have project list here easily available without another query or passing down.
    // However, if we are in "all" view with a project filter, we act like it's a project view.

    switch (view) {
      case "today":
        return { tasks: tasksToday || [], title: "My Day" };
      case "upcoming":
        return { tasks: tasksUpcoming || [], title: "Planned" };
      case "important":
        return { tasks: tasksImportant || [], title: "Important" };
      case "completed":
        return { tasks: tasksCompleted || [], title: "Completed" };
      default:
        return {
          tasks: tasksAll || [],
          title: projectFilter ? "Project Tasks" : "Tasks", // Ideally fetch project name to display "Project X"
        };
    }
  }, [
    view,
    tasksAll,
    tasksToday,
    tasksUpcoming,
    tasksCompleted,
    tasksImportant,
    projectFilter,
  ]);

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

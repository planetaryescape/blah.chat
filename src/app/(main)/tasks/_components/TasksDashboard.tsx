"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { TaskMainView } from "./TaskMainView";
import { TasksSidebar } from "./TasksSidebar";

type ViewType = "all" | "today" | "upcoming" | "completed" | "important";

export function TasksDashboard() {
  const [view, setView] = useState<ViewType>("all");
  const [projectFilter, setProjectFilter] = useState<Id<"projects"> | null>(
    null,
  );
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);

  // Queries
  // @ts-ignore - Type depth exceeded
  const tasksAll = useQuery(
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
      case "all":
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

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Assuming 4rem header height or similar global layout structure.
          If not, h-full might work if parent has height. */}

      <main className="flex w-full h-full rounded-tl-xl border-t border-l overflow-hidden bg-background shadow-2xl">
        <TasksSidebar
          currentView={view}
          onViewChange={(v) => setView(v as ViewType)}
          projectFilter={projectFilter}
          onProjectFilterChange={setProjectFilter}
        />

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

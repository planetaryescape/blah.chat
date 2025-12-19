"use client";

import { TasksDashboard } from "@/app/(main)/tasks/_components/TasksDashboard";
import type { Id } from "@/convex/_generated/dataModel";
import { Suspense, use } from "react";

function TasksDashboardFallback() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading tasks...</div>
    </div>
  );
}

export default function ProjectTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = id as Id<"projects">;

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TasksDashboardFallback />}>
        <TasksDashboard initialProjectId={projectId} hideSidebar />
      </Suspense>
    </div>
  );
}

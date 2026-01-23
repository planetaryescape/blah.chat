"use client";

import { Suspense } from "react";
import { FeatureDisabled } from "@/components/ui/feature-disabled";
import { useUserPreference } from "@/hooks/useUserPreference";
import { TasksDashboard } from "./_components/TasksDashboard";

function TasksDashboardFallback() {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <div className="animate-pulse text-muted-foreground">
        Loading tasks...
      </div>
    </div>
  );
}

export default function TasksPage() {
  const showTasks = useUserPreference("showTasks");

  if (!showTasks) {
    return <FeatureDisabled feature="Tasks" settingKey="showTasks" />;
  }

  return (
    <Suspense fallback={<TasksDashboardFallback />}>
      <TasksDashboard />
    </Suspense>
  );
}

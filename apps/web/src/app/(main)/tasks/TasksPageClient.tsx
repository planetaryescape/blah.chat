"use client";

import { TasksWorkspace } from "@/components/tasks/TasksWorkspace";
import { FeatureDisabled } from "@/components/ui/feature-disabled";
import { useUserPreference } from "@/hooks/useUserPreference";

export function TasksPageClient() {
  const showTasks = useUserPreference("showTasks");

  if (!showTasks) {
    return <FeatureDisabled feature="Tasks" settingKey="showTasks" />;
  }

  return <TasksWorkspace />;
}

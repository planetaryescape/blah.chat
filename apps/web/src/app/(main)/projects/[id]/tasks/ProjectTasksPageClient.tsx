"use client";

import { use } from "react";
import { ProjectTasksWorkspace } from "@/components/projects/ProjectTasksWorkspace";

export default function ProjectTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProjectTasksWorkspace projectId={id} />;
}

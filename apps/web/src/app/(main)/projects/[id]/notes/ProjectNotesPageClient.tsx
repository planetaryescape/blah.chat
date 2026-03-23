"use client";

import { use } from "react";
import { ProjectNotesWorkspace } from "@/components/projects/ProjectNotesWorkspace";

export default function ProjectNotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProjectNotesWorkspace projectId={id} />;
}

"use client";

import { use } from "react";
import { ProjectOverview } from "@/components/projects/ProjectOverview";
import { useProjectSurfaceStats } from "@/hooks/useProjectSurfaceStats";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const surface = useProjectSurfaceStats(id);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
      <div className="px-12 py-8 max-w-5xl">
        <h2 className="text-2xl font-semibold mb-8 tracking-tight">Overview</h2>
        <ProjectOverview
          projectId={id}
          resources={surface.resources}
          stats={surface.stats}
        />
      </div>
    </div>
  );
}

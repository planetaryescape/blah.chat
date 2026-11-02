"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { use } from "react";
import { ProjectOverview } from "@/components/projects/ProjectOverview";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = id as Id<"projects">;
  // @ts-ignore - Type depth exceeded
  const resources = useQuery(api.projects.getProjectResources, { projectId });
  // @ts-ignore - Type depth exceeded
  const stats = useQuery(api.projects.getProjectStats, { projectId });

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
      <div className="px-12 py-8 max-w-5xl">
        <h2 className="text-2xl font-semibold mb-8 tracking-tight">Overview</h2>
        <ProjectOverview
          projectId={projectId}
          resources={resources}
          stats={stats}
        />
      </div>
    </div>
  );
}

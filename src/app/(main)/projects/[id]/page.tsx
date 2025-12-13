"use client";

import { ProjectOverview } from "@/components/projects/ProjectOverview";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";

import { use } from "react";

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
    <div className="h-full overflow-y-auto">
      <div className="container max-w-4xl py-6">
        <h2 className="text-2xl font-semibold mb-6 tracking-tight">Overview</h2>
        <ProjectOverview
          projectId={projectId}
          resources={resources}
          stats={stats}
        />
      </div>
    </div>
  );
}

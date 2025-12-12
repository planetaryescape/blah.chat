"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { ProjectOverview } from "@/components/projects/ProjectOverview";
import { ProjectConversations } from "@/components/projects/ProjectConversations";
import { ProjectFiles } from "@/components/projects/ProjectFiles";
import { ProjectNotes } from "@/components/projects/ProjectNotes";
import { ProjectTasks } from "@/components/projects/ProjectTasks";

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const projectId = params.id as Id<"projects">;

  // @ts-ignore - Type depth exceeded
  const project = useQuery(api.projects.get, { id: projectId });
  // @ts-ignore - Type depth exceeded
  const resources = useQuery(api.projects.getProjectResources, { projectId });
  // @ts-ignore - Type depth exceeded
  const stats = useQuery(api.projects.getProjectStats, { projectId });

  if (!project) {
    return (
      <div className="container max-w-6xl py-8">
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="mt-2 text-muted-foreground">{project.description}</p>
          )}
        </div>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversations">
            Conversations
            {stats && <span className="ml-1.5">({stats.conversationCount})</span>}
          </TabsTrigger>
          <TabsTrigger value="files">
            Files
            {stats && <span className="ml-1.5">({stats.fileCount})</span>}
          </TabsTrigger>
          <TabsTrigger value="notes">
            Notes
            {stats && <span className="ml-1.5">({stats.noteCount})</span>}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            {stats && <span className="ml-1.5">({stats.activeTaskCount})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverview projectId={projectId} resources={resources} stats={stats} />
        </TabsContent>

        <TabsContent value="conversations">
          <ProjectConversations
            projectId={projectId}
            conversations={resources?.conversations || []}
          />
        </TabsContent>

        <TabsContent value="files">
          <ProjectFiles projectId={projectId} files={resources?.files || []} />
        </TabsContent>

        <TabsContent value="notes">
          <ProjectNotes projectId={projectId} notes={resources?.notes || []} />
        </TabsContent>

        <TabsContent value="tasks">
          <ProjectTasks projectId={projectId} tasks={resources?.tasks || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

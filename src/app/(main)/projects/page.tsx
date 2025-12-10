"use client";

import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectsEmptyState } from "@/components/projects/ProjectsEmptyState";
import { TemplateManager } from "@/components/projects/TemplateManager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";
import { api } from "@/convex/_generated/api";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

// ... imports

export default function ProjectsPage() {
  const features = useFeatureToggles();

  // Route guard: show disabled page if projects feature is off
  if (!features.showProjects) {
    return (
      <DisabledFeaturePage featureName="Projects" settingKey="showProjects" />
    );
  }

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const projects = useQuery(api.projects.list);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 bg-gradient-radial from-violet-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/60 backdrop-blur-xl border-b border-border/40 shadow-sm transition-all duration-200">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Projects
              </h1>
              <p className="text-muted-foreground mt-2">
                Organize conversations into projects with custom system prompts
              </p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
        {/* Gradient Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-500/5 pointer-events-none" />
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
          {/* Templates Section */}
          <TemplateManager />

          {/* Projects Section */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">
              Your Projects
            </h2>
            {projects === undefined ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading projects...
              </div>
            ) : projects.filter((p: any) => !p.isTemplate).length === 0 ? (
              <ProjectsEmptyState
                onCreateProject={() => setIsCreateOpen(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects
                  .filter((p: any) => !p.isTemplate)
                  .map((project: any) => (
                    <ProjectCard key={project._id} project={project} />
                  ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <ProjectForm onSuccess={() => setIsCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

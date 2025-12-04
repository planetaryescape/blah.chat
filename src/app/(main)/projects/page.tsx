"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectCard } from "@/components/projects/ProjectCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProjectsPage() {
  const projects = useQuery(api.projects.list);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Organize conversations into projects with custom system prompts
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {projects === undefined ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No projects yet</p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
      )}

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

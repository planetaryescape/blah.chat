"use client";

import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";
import { BulkConversationAssigner } from "@/components/projects/BulkConversationAssigner";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectsEmptyState } from "@/components/projects/ProjectsEmptyState";
import { ProjectTable } from "@/components/projects/ProjectTable";
import { TemplateManager } from "@/components/projects/TemplateManager";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { analytics } from "@/lib/analytics";
import { useMutation, useQuery } from "convex/react";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ProjectsPage() {
  const features = useFeatureToggles();

  // Route guard
  if (!features.showProjects) {
    return (
      <DisabledFeaturePage featureName="Projects" settingKey="showProjects" />
    );
  }

  // @ts-ignore
  const projects = useQuery(api.projects.list);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);

  // Selected Project State (for actions)
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // View State
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Mutations
  // @ts-ignore
  const deleteProject = useMutation(api.projects.deleteProject);

  const handleEdit = (project: any) => {
    setSelectedProject(project);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (id: Id<"projects">) => {
    // Find project to get name? Or just set ID
    // We need the project object for context usually, but here ID is enough for the call
    // But specific selectedProject state is better
    const project = projects?.find((p: any) => p._id === id);
    if (project) {
        setSelectedProject(project);
        setIsDeleteOpen(true);
    }
  };

  const handleManageClick = (id: Id<"projects">, name: string) => {
    setSelectedProject({ _id: id, name });
    setIsManageOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProject) return;
    try {
      await deleteProject({ id: selectedProject._id });
      toast.success("Project deleted");
      analytics.track("project_deleted");
      setIsDeleteOpen(false);
    } catch (error) {
      toast.error("Failed to delete project");
      console.error(error);
    }
  };

  // Filter projects
  const filteredProjects = projects?.filter((p: any) =>
    !p.isTemplate &&
    (searchQuery === "" || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-none z-50 bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Projects
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage and organize your conversations with custom context
                </p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} className="shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 mt-2">
                {/* Search */}
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filter projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 bg-muted/40 border-transparent hover:bg-muted/60 focus:bg-background transition-colors"
                    />
                </div>

                {/* View Toggle */}
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "table")} className="w-[120px]">
                    <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-muted/50">
                        <TabsTrigger value="grid" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs">
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </TabsTrigger>
                        <TabsTrigger value="table" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs">
                            <List className="h-3.5 w-3.5" />
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
          {/* Templates Section - Only show in Grid mode or always? Likely always useful */}
          {/* Maybe hide templates in Table mode to focus on data? Let's keep it for now but maybe collapsible */}
          {viewMode === "grid" && <TemplateManager />}

          {/* Projects List */}
          <div>
            {viewMode === "grid" && (
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold tracking-tight">Your Projects</h2>
                </div>
            )}

            {projects === undefined ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <span className="animate-pulse">Loading projects...</span>
              </div>
            ) : filteredProjects?.length === 0 ? (
               searchQuery ? (
                   <div className="text-center py-12 text-muted-foreground">
                       No projects found matching "{searchQuery}"
                   </div>
               ) : (
                  <ProjectsEmptyState onCreateProject={() => setIsCreateOpen(true)} />
               )
            ) : (
              viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(filteredProjects ?? []).map((project: any) => (
                      <ProjectCard
                          key={project._id}
                          project={project}
                          onEdit={handleEdit}
                          onDelete={handleDeleteClick}
                          onManage={handleManageClick}
                      />
                    ))}
                  </div>
              ) : (
                  <ProjectTable
                      projects={filteredProjects ?? []}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      onManage={handleManageClick}
                  />
              )
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <ProjectForm onSuccess={() => setIsCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={selectedProject}
            onSuccess={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Manage Dialog (Bulk Assigner) - Reusing existing component but creating a wrapper logic if needed */}
      {selectedProject && (
          <BulkConversationAssigner
            open={isManageOpen}
            onOpenChange={setIsManageOpen}
            projectId={selectedProject._id}
            projectName={selectedProject.name}
          />
      )}

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the project "{selectedProject?.name}" and unlink all conversations. The
              conversations themselves will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

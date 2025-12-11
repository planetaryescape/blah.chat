"use client";

import { useMutation } from "convex/react";
import { Edit, FolderOpen, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { analytics } from "@/lib/analytics";
import { BulkConversationAssigner } from "./BulkConversationAssigner";
import { ProjectForm } from "./ProjectForm";
import { ProjectStats } from "./ProjectStats";

interface ProjectCardProps {
  project: {
    _id: Id<"projects">;
    name: string;
    description?: string;
    systemPrompt?: string;
    conversationIds?: Id<"conversations">[]; // Optional after Phase 3 migration
    createdAt: number;
    updatedAt: number;
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const deleteProject = useMutation(api.projects.deleteProject);

  const handleDelete = async () => {
    try {
      await deleteProject({ id: project._id });
      toast.success("Project deleted");

      // Track project deletion
      analytics.track("project_deleted", {
        conversationCount: project.conversationIds?.length || 0,
      });
    } catch (error) {
      toast.error("Failed to delete project");
      console.error(error);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                {project.name}
              </CardTitle>
              {project.description && (
                <CardDescription className="mt-2">
                  {project.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {project.systemPrompt && (
              <div>
                <p className="text-sm font-medium mb-1">System Prompt:</p>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {project.systemPrompt}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsManageOpen(true)}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <ProjectStats projectId={project._id} />
        </CardFooter>
      </Card>

      <BulkConversationAssigner
        open={isManageOpen}
        onOpenChange={setIsManageOpen}
        projectId={project._id}
        projectName={project.name}
      />

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={project}
            onSuccess={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the project and unlink all conversations. The
              conversations themselves will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

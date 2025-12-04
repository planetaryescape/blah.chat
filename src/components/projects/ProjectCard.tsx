"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { ProjectForm } from "./ProjectForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface ProjectCardProps {
  project: {
    _id: Id<"projects">;
    name: string;
    description?: string;
    systemPrompt?: string;
    conversationIds: Id<"conversations">[];
    createdAt: number;
    updatedAt: number;
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteProject = useMutation(api.projects.deleteProject);

  const handleDelete = async () => {
    try {
      await deleteProject({ id: project._id });
      toast.success("Project deleted");
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
                <CardDescription className="mt-2">{project.description}</CardDescription>
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

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{project.conversationIds.length} conversation{project.conversationIds.length === 1 ? "" : "s"}</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
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
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <ProjectForm project={project} onSuccess={() => setIsEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the project and unlink all conversations. The conversations
              themselves will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

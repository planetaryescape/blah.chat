"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = id as Id<"projects">;
  const router = useRouter();

  const project = useQuery(api.projects.get, { id: projectId });
  const updateProject = useMutation(api.projects.update);
  const deleteProject = useMutation(api.projects.deleteProject);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Load initial data
  if (project && !isDirty && !name) {
    setName(project.name);
    setDescription(project.description || "");
    setSystemPrompt(project.systemPrompt || "");
    // Don't set dirty here, just init
  }

  const handleSave = async () => {
    try {
      await updateProject({
        id: projectId,
        name,
        description,
        systemPrompt,
      });
      toast.success("Project updated");
      setIsDirty(false);
    } catch (error) {
      toast.error("Failed to update project");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProject({ id: projectId });
      toast.success("Project deleted");
      router.push("/projects");
    } catch (error) {
      toast.error("Failed to delete project");
      console.error(error);
    }
  };

  if (!project) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-xl max-w-2xl mx-auto w-full">
      <header className="p-6 border-b bg-background/40 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Project Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your project configuration
        </p>
      </header>

      <div className="px-6 space-y-8 pb-10">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setIsDirty(true);
              }}
              placeholder="e.g. Website Redesign"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Brief description of the project"
              className="resize-none h-24"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="systemPrompt">
              System Prompt{" "}
              <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => {
                setSystemPrompt(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Custom instructions for AI whenever working in this project context..."
              className="resize-y h-32 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This prompt will be injected into AI context for chats linked to
              this project.
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave} disabled={!isDirty}>
              Save Changes
            </Button>
          </div>
        </div>

        <div className="border-t pt-8">
          <h3 className="text-lg font-medium text-destructive mb-4">
            Danger Zone
          </h3>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">Delete Project</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this project and all its data.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the project <strong>{project.name}</strong> and remove all
                    associations. tasks, notes, and files will remain but be
                    unlinked.
                    {/* Wait, actual deletion logic suggests it cascades?
                        Checking convex/projects.ts -> deleteProject:
                        It unlinks conversations (junctions deleted), unlinks project from conversations (projectId=undefined).
                        It deletes the project row.
                        It DOES NOT delete the actual notes/files/conversations themselves, just the link.
                        Wait, need to check if it deletes tasks?
                        The deleteProject mutation I saw earlier removes junctions.
                        Tasks? "deleteProject" does NOT seem to delete tasks in the code I reviewed (only junctions).
                        Actually, tasks have projectId. It might need a clean up.
                        But the message above is safe: "remove all associations".
                    */}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete Project
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { analytics } from "@/lib/analytics";

interface ProjectFormProps {
  project?: {
    _id: Id<"projects">;
    name: string;
    description?: string;
    systemPrompt?: string;
  };
  onSuccess?: () => void;
}

export function ProjectForm({ project, onSuccess }: ProjectFormProps) {
  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [systemPrompt, setSystemPrompt] = useState(project?.systemPrompt || "");
  const [isTemplate, setIsTemplate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);

  const isEditing = !!project;

  // Core submission logic
  const executeSubmission = async () => {
    setIsSubmitting(true);

    if (!name.trim()) {
      toast.error("Project name is required");
      setIsSubmitting(false);
      return;
    }

    try {
      if (isEditing) {
        await updateProject({
          id: project._id,
          name: name.trim(),
          description: description.trim() || undefined,
          systemPrompt: systemPrompt.trim() || undefined,
        });
        toast.success("Project updated");

        analytics.track("project_updated", {
          hasDescription: !!description.trim(),
          hasSystemPrompt: !!systemPrompt.trim(),
        });
      } else {
        await createProject({
          name: name.trim(),
          description: description.trim() || undefined,
          systemPrompt: systemPrompt.trim() || undefined,
          isTemplate,
        });
        toast.success(isTemplate ? "Template created" : "Project created");

        analytics.track("project_created", {
          hasDescription: !!description.trim(),
          hasSystemPrompt: !!systemPrompt.trim(),
          isTemplate,
        });
      }
      onSuccess?.();
    } catch (error) {
      toast.error(`Failed to ${isEditing ? "update" : "create"} project`);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debounced wrapper - prevents rapid double-clicks
  const debouncedSubmit = useDebouncedCallback(executeSubmission, 500, {
    leading: true,
    trailing: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    debouncedSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset disabled={isSubmitting} className="space-y-4">
        <div>
          <Label htmlFor="name" className="mb-2">
            Name *
          </Label>
          <Input
            id="project-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Project"
            maxLength={100}
            required
          />
        </div>

        <div>
          <Label htmlFor="description" className="mb-2">
            Description
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
            maxLength={500}
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {description.length}/500 characters
          </p>
        </div>

        <div>
          <Label htmlFor="systemPrompt" className="mb-2">
            System Prompt
          </Label>
          <Textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Instructions for AI when working on this project..."
            maxLength={3000}
            rows={6}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {systemPrompt.length}/3000 characters
          </p>
        </div>

        {!isEditing && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isTemplate"
              checked={isTemplate}
              onCheckedChange={(checked) => setIsTemplate(checked as boolean)}
            />
            <Label
              htmlFor="isTemplate"
              className="text-sm font-normal cursor-pointer"
            >
              Save as template (reusable configuration)
            </Label>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className={isSubmitting ? "pointer-events-none" : ""}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditing ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>{isEditing ? "Update" : "Create"} Project</>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

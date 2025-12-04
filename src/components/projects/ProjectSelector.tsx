"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderOpen } from "lucide-react";

interface ProjectSelectorProps {
  conversationId: Id<"conversations">;
  currentProjectId?: Id<"projects">;
}

export function ProjectSelector({
  conversationId,
  currentProjectId,
}: ProjectSelectorProps) {
  const projects = useQuery(api.projects.list);
  const addConversation = useMutation(api.projects.addConversation);
  const removeConversation = useMutation(api.projects.removeConversation);

  const handleChange = async (value: string) => {
    if (value === "none") {
      // Remove from current project
      if (currentProjectId) {
        await removeConversation({
          projectId: currentProjectId,
          conversationId,
        });
      }
    } else {
      // Add to new project (will auto-remove from old one)
      await addConversation({
        projectId: value as Id<"projects">,
        conversationId,
      });
    }
  };

  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <Select value={currentProjectId || "none"} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px]">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          <SelectValue placeholder="No project" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No project</SelectItem>
        {projects.map((project) => (
          <SelectItem key={project._id} value={project._id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

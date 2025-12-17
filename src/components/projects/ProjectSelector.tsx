"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
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
  const assignConversations = useMutation(api.projects.assignConversations);

  const handleChange = async (value: string) => {
    await assignConversations({
      projectId: value === "none" ? null : (value as Id<"projects">),
      conversationIds: [conversationId],
    });
  };

  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <Select value={currentProjectId || "none"} onValueChange={handleChange}>
      <SelectTrigger
        className="w-auto sm:w-[200px] px-2 sm:px-3"
        aria-label="Select Project"
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 shrink-0" />
          <span className="hidden sm:block truncate">
            <SelectValue placeholder="No project" />
          </span>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No project</SelectItem>
        {projects.map((project: any) => (
          <SelectItem key={project._id} value={project._id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

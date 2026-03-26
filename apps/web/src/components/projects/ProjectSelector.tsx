"use client";

import { FolderOpen } from "lucide-react";
import { useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignConversations } from "@/lib/hooks/mutations/useProjectMutations";
import { useProjects } from "@/lib/hooks/queries/useProjects";

interface ProjectSelectorProps {
  conversationId: string;
  currentProjectId?: string;
}

export function ProjectSelector({
  conversationId,
  currentProjectId,
}: ProjectSelectorProps) {
  const { data: projects } = useProjects();
  const assignConversations = useAssignConversations();
  const lastValueRef = useRef(currentProjectId || "none");

  const handleChange = async (value: string) => {
    // Prevent re-firing when prop updates trigger onValueChange
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;

    await assignConversations.mutateAsync({
      projectId: value === "none" ? "none" : value,
      targetProjectId: value === "none" ? null : value,
      conversationIds: [conversationId],
    });
  };

  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <Select value={currentProjectId || "none"} onValueChange={handleChange}>
      <SelectTrigger
        className="w-auto h-7! px-2 sm:px-3 max-w-[180px] min-w-0"
        aria-label="Select Project"
        size="sm"
      >
        <div className="flex items-center flex-1 min-w-0 gap-2">
          <FolderOpen className="w-4 h-4 shrink-0" />
          <span className="flex-1 hidden min-w-0 truncate sm:block">
            <SelectValue placeholder="No project" />
          </span>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No project</SelectItem>
        {projects?.map((project) => (
          <SelectItem key={project._id} value={project._id}>
            <span className="truncate" title={project.name}>
              {project.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

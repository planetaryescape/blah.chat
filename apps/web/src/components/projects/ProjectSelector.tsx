"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { FolderOpen } from "lucide-react";
import { useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const lastValueRef = useRef(currentProjectId || "none");

  const handleChange = async (value: string) => {
    // Prevent re-firing when prop updates trigger onValueChange
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;

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
        className="w-auto sm:w-[200px] px-2 sm:px-3 max-w-[180px] min-w-0"
        aria-label="Select Project"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FolderOpen className="w-4 h-4 shrink-0" />
          <span className="hidden sm:block truncate min-w-0 flex-1">
            <SelectValue placeholder="No project" />
          </span>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No project</SelectItem>
        {projects?.map((project: any) => (
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

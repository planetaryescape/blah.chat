"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { FolderOpen } from "lucide-react";

interface ProjectBadgeProps {
  projectId: Id<"projects">;
  onClick?: () => void;
}

export function ProjectBadge({ projectId, onClick }: ProjectBadgeProps) {
  const project = useQuery(api.projects.get, { id: projectId });

  if (!project) {
    return (
      <Badge variant="secondary" className="text-xs">
        <FolderOpen className="w-3 h-3 mr-1" />
        Deleted project
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <FolderOpen className="w-3 h-3 mr-1" />
      {project.name}
    </Badge>
  );
}

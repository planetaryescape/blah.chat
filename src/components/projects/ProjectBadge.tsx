"use client";

import { useQuery } from "convex/react";
import { FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface ProjectBadgeProps {
  projectId: Id<"projects">;
  onClick?: () => void;
  collapsed?: boolean;
}

export function ProjectBadge({
  projectId,
  onClick,
  collapsed,
}: ProjectBadgeProps) {
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
      className={cn(
        "text-xs cursor-pointer transition-all duration-200",
        collapsed
          ? "px-0.5 py-0 bg-transparent opacity-30 hover:opacity-100 hover:bg-secondary/80"
          : "hover:bg-secondary/80",
      )}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      title={collapsed ? project.name : undefined}
    >
      <FolderOpen className={cn("w-3 h-3", !collapsed && "mr-1")} />
      {!collapsed && project.name}
    </Badge>
  );
}

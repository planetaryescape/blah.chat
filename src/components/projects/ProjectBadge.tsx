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
  onKeyDown?: (e: React.KeyboardEvent) => void;
  collapsed?: boolean;
}

export function ProjectBadge({
  projectId,
  onClick,
  onKeyDown,
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

  if (collapsed) {
    return;
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs cursor-pointer transition-all duration-200",
        "max-w-[220px] min-w-0",
      )}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onKeyDown={(e) => {
        if (onKeyDown) {
          e.stopPropagation();
          onKeyDown(e);
        }
      }}
      tabIndex={onClick ? 0 : -1}
      role={onClick ? "button" : undefined}
      title={project.name} // Always show full name in tooltip
    >
      <FolderOpen className={cn("w-3 h-3 shrink-0", !collapsed && "mr-1")} />
      {!collapsed && (
        <span className="truncate min-w-0 flex-1">{project.name}</span>
      )}
    </Badge>
  );
}

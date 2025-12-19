"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import {
    ArrowUpRight,
    Clock,
    FolderOpen,
    Layout,
    MoreVertical,
    Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ProjectStats } from "./ProjectStats";

interface ProjectCardProps {
  project: {
    _id: Id<"projects">;
    name: string;
    description?: string;
    systemPrompt?: string;
    createdAt: number;
    updatedAt: number;
  };
  onEdit?: (project: any) => void;
  onDelete?: (id: Id<"projects">) => void;
  onManage?: (id: Id<"projects">, name: string) => void;
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onManage,
}: ProjectCardProps) {
  const router = useRouter();

  return (
    <div
      className="group relative flex flex-col h-full bg-card hover:bg-muted/10 border border-border/40 hover:border-border/80 rounded-xl overflow-hidden shadow-sm transition-all duration-300 cursor-pointer"
      onClick={() => router.push(`/projects/${project._id}`)}
    >
      <div className="flex flex-col flex-1 p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shadow-inner">
              <FolderOpen className="w-5 h-5 currentColor" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDistanceToNow(project.updatedAt, { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mt-1 -mr-2 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push(`/projects/${project._id}`)}>
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Open Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onManage && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onManage(project._id, project.name);
                  }}
                >
                  <Layout className="w-4 h-4 mr-2" />
                  Manage Content
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(project);
                  }}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        <div className="flex-1 mb-6">
          <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
            {project.description || (
              <span className="italic opacity-50">No description provided</span>
            )}
          </p>
        </div>

        {/* Footer / Stats */}
        <div className="pt-4 mt-auto border-t border-border/40">
           <ProjectStats projectId={project._id} />
        </div>
      </div>
    </div>
  );
}

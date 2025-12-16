"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Id } from "@/convex/_generated/dataModel";
import { Edit, FolderOpen, MoreVertical, Trash2, Users } from "lucide-react";
import Link from "next/link";
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

export function ProjectCard({ project, onEdit, onDelete, onManage }: ProjectCardProps) {
  const router = useRouter();

  return (
    <Card
      onClick={() => router.push(`/projects/${project._id}`)}
      className="group relative overflow-hidden hover:bg-muted/30 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
    >


      <CardHeader className="relative z-10 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-4">
             <div className="flex items-center gap-2 mb-1.5">
                <div className="bg-primary/10 text-primary p-1.5 rounded-md">
                   <FolderOpen className="w-4 h-4" />
                </div>
             </div>
            <CardTitle className="text-base font-semibold truncate leading-tight">
              {project.name}
            </CardTitle>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2 text-muted-foreground/50 hover:text-foreground relative z-20">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-30">
                <Link href={`/projects/${project._id}`} className="w-full relative z-30">
                    <DropdownMenuItem>
                        Open Project
                    </DropdownMenuItem>
                </Link>
                {onManage && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onManage(project._id, project.name); }}>
                        <Users className="w-4 h-4 mr-2" />
                        Manage Conversations
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onEdit && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Details
                    </DropdownMenuItem>
                )}
                {onDelete && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(project._id); }} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Project
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 pb-4 min-h-[5rem]">
         <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed h-[2.5rem]">
            {project.description || "No description provided."}
         </p>
      </CardContent>

      <CardFooter className="relative z-10 pt-0 text-xs text-muted-foreground border-t bg-muted/5 p-3 flex justify-between items-center">
        <ProjectStats projectId={project._id} />
      </CardFooter>
    </Card>
  );
}

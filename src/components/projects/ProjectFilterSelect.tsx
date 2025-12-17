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
import { useQuery } from "convex/react";
import { FolderOpen } from "lucide-react";

interface ProjectFilterSelectProps {
  value: Id<"projects"> | null;
  onChange: (id: Id<"projects"> | null) => void;
  className?: string;
}

/**
 * Generic project filter selector for filtering lists by project.
 * Used in Notes and Tasks pages.
 */
export function ProjectFilterSelect({
  value,
  onChange,
  className = "w-[180px]",
}: ProjectFilterSelectProps) {
  // @ts-ignore - Type depth exceeded
  const projects = useQuery(api.projects.list);

  const handleChange = (selected: string) => {
    onChange(selected === "all" ? null : (selected as Id<"projects">));
  };

  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <Select value={value || "all"} onValueChange={handleChange}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
          <SelectValue placeholder="All Projects" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Projects</SelectItem>
        {projects.map((project: any) => (
          <SelectItem key={project._id} value={project._id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

"use client";

import { FolderOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/lib/hooks/queries/useProjects";

interface ProjectFilterSelectProps {
  value: string | null;
  onChange: (id: string | null) => void;
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
  const { data: projects } = useProjects();

  const handleChange = (selected: string) => {
    onChange(selected === "all" ? null : selected);
  };

  if (!projects || projects.length === 0) {
    return null;
  }

  // Determine if a specific project is selected (not "All Projects")
  const isProjectSelected = value !== null;

  return (
    <div className="min-w-0">
      <Select value={value || "all"} onValueChange={handleChange}>
        <SelectTrigger
          className={`${className} min-w-0 px-2.5 transition-all duration-200 ${
            isProjectSelected
              ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20"
              : ""
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FolderOpen
              className={`w-4 h-4 shrink-0 transition-colors ${
                isProjectSelected ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <div className="truncate min-w-0">
              <SelectValue placeholder="All Projects" />
            </div>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project._id} value={project._id}>
              <span className="truncate" title={project.name}>
                {project.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

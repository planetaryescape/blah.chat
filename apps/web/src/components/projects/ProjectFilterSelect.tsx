"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { FolderOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
          {projects.map((project: any) => (
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

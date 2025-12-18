"use client";

import { useQuery } from "convex/react";
import { FolderOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";

interface ProjectFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function ProjectFilter({ value, onChange }: ProjectFilterProps) {
  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const projects = useQuery(api.projects.list);

  const handleChange = (newValue: string) => {
    if (newValue === "all") {
      onChange(null);
    } else {
      onChange(newValue);
    }
  };

  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <div className="w-full min-w-0">
      <Select value={value || "all"} onValueChange={handleChange}>
        <SelectTrigger className="w-full min-w-0 px-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FolderOpen className="w-4 h-4 shrink-0" />
            <div className="truncate min-w-0 ">
              <SelectValue placeholder="All projects" />
            </div>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          <SelectItem value="none">Unassigned</SelectItem>
          {projects?.map((project: any) => (
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

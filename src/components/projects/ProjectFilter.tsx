"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { FolderOpen } from "lucide-react";

interface ProjectFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function ProjectFilter({ value, onChange }: ProjectFilterProps) {
  // @ts-ignore
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
    <Select value={value || "all"} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          <SelectValue placeholder="All projects" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All projects</SelectItem>
        <SelectItem value="none">Unassigned</SelectItem>
        {projects.map((project: any) => (
          <SelectItem key={project._id} value={project._id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TaskFilters({
  view,
  onViewChange,
  projectFilter,
  onProjectFilterChange,
  onCreateClick,
}: {
  view: string;
  onViewChange: (view: string) => void;
  projectFilter: Id<"projects"> | null;
  onProjectFilterChange: (id: Id<"projects"> | null) => void;
  onCreateClick: () => void;
}) {
  // @ts-ignore - Type depth exceeded
  const projects = useQuery(api.projects.list);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Tabs value={view} onValueChange={onViewChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex gap-2">
        <Select
          value={projectFilter || "all"}
          onValueChange={(value) =>
            onProjectFilterChange(
              value === "all" ? null : (value as Id<"projects">),
            )
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects?.map((project: Doc<"projects">) => (
              <SelectItem key={project._id} value={project._id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>
    </div>
  );
}

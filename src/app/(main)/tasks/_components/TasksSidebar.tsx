"use client";

import { useQuery } from "convex/react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Home,
  List,
  Plus,
  Star,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface TasksSidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  projectFilter: Id<"projects"> | null;
  onProjectFilterChange: (id: Id<"projects"> | null) => void;
}

export function TasksSidebar({
  currentView,
  onViewChange,
  projectFilter,
  onProjectFilterChange,
}: TasksSidebarProps) {
  // @ts-ignore - Type depth exceeded
  const projects = useQuery(api.projects.list);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);

  const mainNavItems = [
    { id: "today", label: "My Day", icon: Sun },
    {
      id: "important",
      label: "Important",
      icon: Star,
    },
    {
      id: "upcoming",
      label: "Planned",
      icon: CalendarDays,
    },
    { id: "all", label: "Tasks", icon: Home },
    {
      id: "completed",
      label: "Completed",
      icon: List,
    }, // Added Completed explicitly
  ];

  return (
    <div className="w-[280px] bg-muted/30 h-full flex flex-col border-r border-border/40">
      <div className="p-4">
        {mainNavItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              "w-full justify-start mb-1 text-sm font-normal",
              currentView === item.id
                ? "bg-secondary text-primary font-medium"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
            onClick={() => {
              onViewChange(item.id);
              onProjectFilterChange(null);
            }}
          >
            <item.icon
              className={cn(
                "mr-3 h-4 w-4",
                currentView === item.id
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            {item.label}
          </Button>
        ))}
      </div>

      <div className="px-4 py-2">
        <div className="h-[1px] bg-border" />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 pt-0">
          <Button
            variant="ghost"
            className="w-full justify-between mb-1 hover:bg-transparent px-2"
            onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Projects
            </span>
            {isProjectsExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>

          {isProjectsExpanded && (
            <div className="space-y-1 mt-1">
              {projects?.map((project: Doc<"projects">) => (
                <Button
                  key={project._id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start font-normal pl-2",
                    projectFilter === project._id
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:bg-secondary/50",
                  )}
                  onClick={() => {
                    onProjectFilterChange(project._id);
                    onViewChange("project"); // Special view for generic project list? Or reuse 'all' with filter?
                    // Let's stick to the plan: ViewType is "all" | ...
                    // But if I click a project, I want to see tasks for that project.
                    // The 'all' view already supports filtering by projectId.
                    onViewChange("all");
                  }}
                >
                  <List className="mr-3 h-4 w-4" />
                  <span className="truncate">{project.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {/* Could show count here if available */}
                  </span>
                </Button>
              ))}

              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-primary pl-2"
              >
                <Plus className="mr-3 h-4 w-4" />
                New Project
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

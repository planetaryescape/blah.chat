"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  Archive,
  ChevronLeft,
  FileText,
  FolderOpen,
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ProjectLayoutProps {
  projectId: Id<"projects">;
  children: ReactNode;
}

export function ProjectLayout({ projectId, children }: ProjectLayoutProps) {
  const _router = useRouter();
  const pathname = usePathname();
  // @ts-ignore - Type depth exceeded
  const project = useQuery(api.projects.get, { id: projectId });
  // @ts-ignore - Type depth exceeded
  const stats = useQuery(api.projects.getProjectStats, { projectId });

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  // Helper to check active tab
  const isActive = (path: string) => {
    // If just /projects/[id], it's overview
    if (path === "overview" && pathname === `/projects/${projectId}`)
      return true;
    return pathname?.includes(path);
  };

  const navItems = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutGrid,
      path: `/projects/${projectId}`,
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: Archive, // Using Archive as placeholder for "Tasks" drawer icon, commonly used in Linear-likes
      path: `/projects/${projectId}/tasks`,
      count: stats?.taskStats?.active || undefined,
    },
    {
      id: "notes",
      label: "Notes",
      icon: FileText,
      path: `/projects/${projectId}/notes`,
      count: stats?.noteCount || undefined,
    },
    {
      id: "files",
      label: "Files",
      icon: FolderOpen,
      path: `/projects/${projectId}/files`,
      count: stats?.fileCount || undefined,
    },
    {
      id: "conversations",
      label: "Conversations",
      icon: MessageSquare,
      path: `/projects/${projectId}/conversations`,
      count: stats?.conversationCount || undefined,
    },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[260px] flex-none border-r bg-muted/10 flex flex-col">
        {/* Project Header */}
        <div className="p-4 pt-6">
          <Link
            href="/projects"
            className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center mb-6 transition-colors group"
          >
            <ChevronLeft className="h-3 w-3 mr-1 transition-transform group-hover:-translate-x-0.5" />
            Back to Projects
          </Link>
          <div className="flex items-center justify-between group mb-2">
            <h1 className="font-semibold text-lg tracking-tight truncate pr-2">
              {project.name}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                asChild
                className={cn(
                  "w-full justify-between h-9 px-3 font-normal",
                  isActive(item.id)
                    ? "bg-secondary text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                )}
              >
                <Link href={item.path}>
                  <div className="flex items-center">
                    <item.icon
                      className={cn(
                        "mr-3 h-4 w-4",
                        isActive(item.id)
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    {item.label}
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-xs text-muted-foreground/60 font-mono">
                      {item.count}
                    </span>
                  )}
                </Link>
              </Button>
            ))}
          </div>

          <Separator className="my-4 mx-2 w-auto bg-border/40" />

          {/* Settings Link */}
          <Button
            variant="ghost"
            asChild
            className={cn(
              "w-full justify-start h-9 px-3 font-normal text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              isActive("settings") && "bg-secondary text-primary font-medium",
            )}
          >
            <Link href={`/projects/${projectId}/settings`}>
              <Settings
                className={cn(
                  "mr-3 h-4 w-4",
                  isActive("settings")
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              Settings
            </Link>
          </Button>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative z-10 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

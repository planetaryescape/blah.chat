"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  Archive,
  ChevronLeft,
  FileText,
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

interface ProjectLayoutProps {
  projectId: Id<"projects">;
  children: ReactNode;
}

export function ProjectLayout({ projectId, children }: ProjectLayoutProps) {
  const router = useRouter();
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
      <aside className="w-[260px] flex-none border-r bg-muted/10 flex flex-col pt-3 pb-4">
        {/* Project Header */}
        <div className="px-4 mb-6">
          <Link
            href="/projects"
            className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center mb-4 transition-colors"
          >
            <ChevronLeft className="h-3 w-3 mr-1" />
            All Projects
          </Link>
          <div className="flex items-start justify-between group">
            <h1 className="font-semibold text-lg tracking-tight truncate pr-2">
              {project.name}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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
                  "w-full justify-between h-8 px-2.5 font-normal",
                  isActive(item.id)
                    ? "bg-secondary/50 text-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary/30 hover:text-foreground",
                )}
              >
                <Link href={item.path}>
                  <div className="flex items-center">
                    <item.icon
                      className={cn(
                        "mr-2.5 h-4 w-4",
                        isActive(item.id)
                          ? "text-primary"
                          : "text-muted-foreground/70",
                      )}
                    />
                    {item.label}
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-xs text-muted-foreground/50 font-mono">
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
              "w-full justify-start h-8 px-2.5 font-normal text-muted-foreground hover:bg-secondary/30 hover:text-foreground",
            )}
          >
            <Link href={`/projects/${projectId}/settings`}>
              <Settings className="mr-2.5 h-4 w-4 text-muted-foreground/70" />
              Settings
            </Link>
          </Button>
        </ScrollArea>
      </aside>

      {/* Main Content Shell */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative z-10 shadow-xl rounded-l-2xl border-l -ml-1 my-0 overflow-hidden">
        {/* Top Gradient - subtle */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

        {children}
      </main>
    </div>
  );
}

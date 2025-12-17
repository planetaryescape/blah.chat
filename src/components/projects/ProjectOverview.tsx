"use client";

import {
  CheckSquare,
  FileText,
  MessageSquare,
  NotebookPen,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Id } from "@/convex/_generated/dataModel";

export function ProjectOverview({
  projectId,
  resources,
  stats,
}: {
  projectId: Id<"projects">;
  resources: any;
  stats: any;
}) {
  return (
    <div className="space-y-8">
      {/* Stats Grid - Minimalist */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="p-4 rounded-lg bg-card border shadow-sm transition-all hover:bg-secondary/20">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Conversations
            </span>
          </div>
          <p className="text-2xl font-light tracking-tight">
            {stats?.conversationCount || 0}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-card border shadow-sm transition-all hover:bg-secondary/20">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Files
            </span>
          </div>
          <p className="text-2xl font-light tracking-tight">
            {stats?.fileCount || 0}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-card border shadow-sm transition-all hover:bg-secondary/20">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <NotebookPen className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Notes
            </span>
          </div>
          <p className="text-2xl font-light tracking-tight">
            {stats?.noteCount || 0}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-card border shadow-sm transition-all hover:bg-secondary/20">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CheckSquare className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Active Tasks
            </span>
          </div>
          <p className="text-2xl font-light tracking-tight">
            {stats?.activeTaskCount || 0}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      {/* Recent Activity */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
          Recent Activity
        </h3>
        <Card className="border shadow-sm bg-card/50">
          {resources && (
            <div className="divide-y divide-border/50">
              {resources.conversations?.slice(0, 3).map((conv: any) => (
                <div
                  key={conv._id}
                  className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary/70 transition-colors" />
                    <span className="text-sm text-foreground/90 font-medium truncate">
                      {conv.title || "Untitled conversation"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground/60 font-mono whitespace-nowrap ml-4">
                    {new Date(conv.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}
              {resources.files?.slice(0, 3).map((file: any) => (
                <div
                  key={file._id}
                  className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary/70 transition-colors" />
                    <span className="text-sm text-foreground/90 font-medium truncate">
                      {file.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground/60 font-mono whitespace-nowrap ml-4">
                    {new Date(file.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}
              {(!resources.conversations ||
                resources.conversations.length === 0) &&
                (!resources.files || resources.files.length === 0) && (
                  <div className="p-8 text-center text-sm text-muted-foreground/60 italic">
                    No recent activity
                  </div>
                )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import {
  MessageSquare,
  FileText,
  NotebookPen,
  CheckSquare,
} from "lucide-react";

export function ProjectOverview({
  projectId,
  resources,
  stats,
}: {
  projectId: Id<"projects">;
  resources: any;
  stats: any;
}) {
  const statCards = [
    {
      icon: MessageSquare,
      label: "Conversations",
      value: stats?.conversationCount || 0,
      color: "text-blue-500",
    },
    {
      icon: FileText,
      label: "Files",
      value: stats?.fileCount || 0,
      color: "text-green-500",
    },
    {
      icon: NotebookPen,
      label: "Notes",
      value: stats?.noteCount || 0,
      color: "text-purple-500",
    },
    {
      icon: CheckSquare,
      label: "Active Tasks",
      value: stats?.activeTaskCount || 0,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center gap-4">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-medium">Recent Activity</h3>
        {resources && (
          <div className="space-y-3">
            {resources.conversations?.slice(0, 3).map((conv: any) => (
              <div key={conv._id} className="flex items-center gap-3 text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">
                  {conv.title || "Untitled conversation"}
                </span>
                <span className="text-muted-foreground">
                  {new Date(conv.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {resources.files?.slice(0, 3).map((file: any) => (
              <div key={file._id} className="flex items-center gap-3 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-muted-foreground">
                  {new Date(file.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {(!resources.conversations ||
              resources.conversations.length === 0) &&
              (!resources.files || resources.files.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  No recent activity
                </p>
              )}
          </div>
        )}
      </Card>
    </div>
  );
}

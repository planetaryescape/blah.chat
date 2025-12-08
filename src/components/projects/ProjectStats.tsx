"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Clock } from "lucide-react";

interface ProjectStatsProps {
  projectId: Id<"projects">;
}

export function ProjectStats({ projectId }: ProjectStatsProps) {
  const stats = useQuery(api.projects.getProjectStats, { projectId });

  if (!stats) {
    return (
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          Loading...
        </span>
      </div>
    );
  }

  const { conversationCount, lastActivity } = stats;

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <MessageSquare className="w-3 h-3" />
        {conversationCount}{" "}
        {conversationCount === 1 ? "conversation" : "conversations"}
      </span>
      {lastActivity > 0 && (
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(lastActivity, { addSuffix: true })}
        </span>
      )}
      {conversationCount === 0 && (
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Never used
        </span>
      )}
    </div>
  );
}

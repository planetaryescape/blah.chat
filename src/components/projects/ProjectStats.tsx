"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
    CheckCircle2,
    Clock,
    File,
    FileText,
    MessageSquare,
} from "lucide-react";

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

  const {
    conversationCount,
    noteCount,
    fileCount,
    taskStats,
    lastActivityAt,
  } = stats;
  const totalResources = conversationCount + noteCount + fileCount;

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <MessageSquare className="w-3 h-3" />
        {conversationCount}{" "}
        {conversationCount === 1 ? "conversation" : "conversations"}
      </span>
      <span className="flex items-center gap-1">
        <FileText className="w-3 h-3" />
        {noteCount} {noteCount === 1 ? "note" : "notes"}
      </span>
      <span className="flex items-center gap-1">
        <File className="w-3 h-3" />
        {fileCount} {fileCount === 1 ? "file" : "files"}
      </span>
      <span className="flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        {taskStats.completed}/{taskStats.total} tasks
      </span>
      {lastActivityAt > 0 && totalResources > 0 && (
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(lastActivityAt, { addSuffix: true })}
        </span>
      )}
      {totalResources === 0 && (
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Never used
        </span>
      )}
    </div>
  );
}

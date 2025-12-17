"use client";

import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, File, FileText, MessageSquare } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface ProjectStatsProps {
  projectId: Id<"projects">;
}

export function ProjectStats({ projectId }: ProjectStatsProps) {
  // @ts-ignore
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

  const { conversationCount, noteCount, fileCount, taskStats, lastActivityAt } =
    stats;
  const _totalResources = conversationCount + noteCount + fileCount;

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground/80">
      <div className="flex items-center gap-3">
        {conversationCount > 0 && (
          <div
            className="flex items-center gap-1.5"
            title={`${conversationCount} conversations`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{conversationCount}</span>
          </div>
        )}
        {noteCount > 0 && (
          <div
            className="flex items-center gap-1.5"
            title={`${noteCount} notes`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{noteCount}</span>
          </div>
        )}
        {fileCount > 0 && (
          <div
            className="flex items-center gap-1.5"
            title={`${fileCount} files`}
          >
            <File className="w-3.5 h-3.5" />
            <span>{fileCount}</span>
          </div>
        )}
        {taskStats.total > 0 && (
          <div
            className="flex items-center gap-1.5"
            title={`${taskStats.completed}/${taskStats.total} tasks completed`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {taskStats.completed}/{taskStats.total}
            </span>
          </div>
        )}
      </div>

      <div className="ml-auto">
        {lastActivityAt > 0 ? (
          <span
            className="text-[10px] text-muted-foreground/60"
            title={`Last active ${formatDistanceToNow(lastActivityAt)} ago`}
          >
            {formatDistanceToNow(lastActivityAt, { addSuffix: true })}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/60">
            No activity
          </span>
        )}
      </div>
    </div>
  );
}

"use client";

import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { File, MessageSquare, NotebookPen } from "lucide-react";

interface ProjectStatsProps {
  projectId: Id<"projects">;
}

export function ProjectStats({ projectId }: ProjectStatsProps) {
  // @ts-ignore
  const stats = useQuery(api.projects.getProjectStats, { projectId });

  if (!stats) {
    return (
      <div className="w-full space-y-3">
        <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-12 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
             <div className="h-full w-1/3 bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  const { conversationCount, noteCount, fileCount, taskStats } = stats;

  // Calculate completion percentage safely
  const completionPercentage = taskStats.total > 0
    ? Math.round((taskStats.completed / taskStats.total) * 100)
    : 0;

  return (
    <div className="w-full space-y-4">
      {/* Resource Counts Row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground/80">
         <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" title="Conversations">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{conversationCount}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Notes">
                <NotebookPen className="w-3.5 h-3.5" />
                <span>{noteCount}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Files">
                <File className="w-3.5 h-3.5" />
                <span>{fileCount}</span>
            </div>
         </div>

         {taskStats.total > 0 && (
           <div className={cn("flex items-center gap-1.5 font-medium",
               completionPercentage === 100 ? "text-emerald-500" : "text-primary"
           )}>
              <span className="text-[10px]">{completionPercentage}% done</span>
           </div>
         )}
      </div>

      {/* Progress Bar - Only if tasks exist */}
      {taskStats.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
              <span>Task Progress</span>
              <span>{taskStats.completed}/{taskStats.total}</span>
          </div>
          <Progress
              value={completionPercentage}
              className="h-1.5 bg-muted/60"
              indicatorClassName={cn(
                  "transition-all duration-500",
                  completionPercentage === 100 ? "bg-emerald-500" : "bg-primary"
              )}
          />
        </div>
      )}
    </div>
  );
}

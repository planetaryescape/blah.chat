"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextWindowIndicatorProps {
  conversationId: Id<"conversations">;
}

export function ContextWindowIndicator({
  conversationId,
}: ContextWindowIndicatorProps) {
  const tokenUsage = useQuery(api.conversations.getTokenUsage, {
    conversationId,
  });

  if (!tokenUsage) {
    return null;
  }

  const {
    systemTokens,
    messagesTokens,
    memoriesTokens,
    totalTokens,
    contextLimit,
  } = tokenUsage;
  const percentage = Math.round((totalTokens / contextLimit) * 100);

  // Determine warning level
  const getWarningLevel = () => {
    if (percentage >= 95) return "critical";
    if (percentage >= 85) return "warning";
    if (percentage >= 70) return "caution";
    return "safe";
  };

  const warningLevel = getWarningLevel();

  const getProgressColor = () => {
    switch (warningLevel) {
      case "critical":
        return "bg-destructive";
      case "warning":
        return "bg-yellow-500";
      case "caution":
        return "bg-yellow-400";
      default:
        return "bg-primary";
    }
  };

  const getIcon = () => {
    if (warningLevel === "critical" || warningLevel === "warning") {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    return <Info className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 min-w-[200px]">
            {getIcon()}
            <div className="flex-1">
              <Progress
                value={percentage}
                className={cn("h-2", getProgressColor())}
              />
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">
              {totalTokens.toLocaleString()} / {contextLimit.toLocaleString()}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          <div className="space-y-2">
            <div className="font-semibold">Context Window Usage</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">System prompts:</span>
                <span className="tabular-nums">
                  {systemTokens.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Memories:</span>
                <span className="tabular-nums">
                  {memoriesTokens.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Messages:</span>
                <span className="tabular-nums">
                  {messagesTokens.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-4 pt-1 border-t">
                <span className="font-medium">Total:</span>
                <span className="tabular-nums font-medium">
                  {totalTokens.toLocaleString()} ({percentage}%)
                </span>
              </div>
            </div>
            {warningLevel === "critical" && (
              <div className="pt-2 text-sm text-destructive">
                <strong>Critical:</strong> Context nearly full. Consider
                starting a new conversation.
              </div>
            )}
            {warningLevel === "warning" && (
              <div className="pt-2 text-sm text-yellow-600">
                <strong>Warning:</strong> Context filling up. New conversation
                recommended soon.
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

"use client";

import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getModelConfig } from "@/lib/ai/utils";
import { useQuery } from "convex/react";
import { AlertCircle, Info } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface ContextWindowIndicatorProps {
  conversationId: Id<"conversations">;
  modelId: string; // Currently selected model
}

export function ContextWindowIndicator({
  conversationId,
  modelId,
}: ContextWindowIndicatorProps) {
  // @ts-ignore
  const tokenUsage = useQuery(api.conversations.getTokenUsage, {
    conversationId,
  });

  // Get context limit from currently selected model, not stored value
  const modelConfig = getModelConfig(modelId);
  const contextLimit = modelConfig?.contextWindow ?? 128000; // Fallback to 128K

  if (!tokenUsage) {
    return null;
  }

  const { systemTokens, messagesTokens, memoriesTokens, totalTokens } =
    tokenUsage;
  const percentage = Math.min(
    100,
    Math.round((totalTokens / contextLimit) * 100),
  );

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
                className="h-2"
                indicatorClassName={getProgressColor()}
              />
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">
              {percentage}%
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
                <span className="font-medium">Total Usage:</span>
                <span className="tabular-nums font-medium">
                  {totalTokens.toLocaleString()} ({percentage}%)
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Context Limit:</span>
                <span className="tabular-nums">
                  {contextLimit.toLocaleString()}
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

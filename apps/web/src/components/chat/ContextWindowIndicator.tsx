"use client";

import { isAutoModel } from "@blah-chat/ai/models";
import { getModelConfig } from "@blah-chat/ai/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApiClient } from "@/lib/api/client";

interface ContextWindowIndicatorProps {
  conversationId: string;
  modelId: string; // Currently selected model
}

interface TokenUsage {
  systemTokens: number;
  messagesTokens: number;
  memoriesTokens: number;
  totalTokens: number;
}

interface LastAssistantMessage {
  routingDecision?: {
    selectedModelId?: string;
  };
}

export function ContextWindowIndicator({
  conversationId,
  modelId,
}: ContextWindowIndicatorProps) {
  const apiClient = useApiClient();

  // TODO: Phase 15 - need dedicated REST route for token usage
  const { data: tokenUsage } = useQuery<TokenUsage>({
    queryKey: ["token-usage", conversationId],
    queryFn: () =>
      apiClient.get<TokenUsage>(
        `/api/v1/conversations/${encodeURIComponent(conversationId)}/token-usage`,
      ),
    enabled: !!conversationId,
  });

  // TODO: Phase 15 - need dedicated REST route for last assistant message
  const { data: lastMessage } = useQuery<LastAssistantMessage>({
    queryKey: ["last-assistant-message", conversationId],
    queryFn: () =>
      apiClient.get<LastAssistantMessage>(
        `/api/v1/conversations/${encodeURIComponent(conversationId)}/last-assistant-message`,
      ),
    enabled: !!conversationId,
  });

  // For Auto model, use the actual routed model's context window
  const effectiveModelId =
    isAutoModel(modelId) && lastMessage?.routingDecision?.selectedModelId
      ? lastMessage.routingDecision.selectedModelId
      : modelId;

  const modelConfig = getModelConfig(effectiveModelId);
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

  const getStrokeColor = () => {
    switch (warningLevel) {
      case "critical":
        return "stroke-destructive";
      case "warning":
        return "stroke-yellow-500";
      case "caution":
        return "stroke-yellow-400";
      default:
        return "stroke-primary";
    }
  };

  // Circular progress SVG params
  const size = 20;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-pointer">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="-rotate-90"
            >
              {/* Background track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                className="stroke-muted-foreground/30"
              />
              {/* Progress arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={getStrokeColor()}
              />
            </svg>
            <span className="text-xs text-muted-foreground tabular-nums">
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
